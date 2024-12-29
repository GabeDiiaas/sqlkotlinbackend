require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const port = 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Configurações de banco de dados
const dbConfigs = {
    db1: {
        user: process.env.DB_USER_1,
        password: process.env.DB_PASSWORD_1,
        server: process.env.DB_SERVER_1,
        database: process.env.DB_DATABASE_1,
    },
    db2: {
        user: process.env.DB_USER_2,
        password: process.env.DB_PASSWORD_2,
        server: process.env.DB_SERVER_2,
        database: process.env.DB_DATABASE_2,
    },
    db3: {
        user: process.env.DB_USER_3,
        password: process.env.DB_PASSWORD_3,
        server: process.env.DB_SERVER_3,
        database: process.env.DB_DATABASE_3,
    },
};

// Cache de instâncias do Sequelize
const sequelizeInstances = {};
const getSequelizeInstance = (dbConfig) => {
    const key = `${dbConfig.server}_${dbConfig.database}`;
    if (!sequelizeInstances[key]) {
        sequelizeInstances[key] = new Sequelize({
            dialect: 'mssql',
            host: dbConfig.server,
            username: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database,
            dialectOptions: {
                encrypt: true,
                trustServerCertificate: process.env.NODE_ENV !== 'production',
            },
        });
    }
    return sequelizeInstances[key];
};

app.get('/products', async (req, res) => {
    const { ip, db } = req.query;

    if (!ip || !db || !dbConfigs[db]) {
        return res.status(400).send('IP e banco de dados são obrigatórios');
    }

    const dbConfig = dbConfigs[db];
    dbConfig.server = ip;

    const sequelize = getSequelizeInstance(dbConfig);

    try {
        await sequelize.authenticate();

        // Consultas
        const Material = sequelize.define('Material', {
            MAT_DESC: { type: DataTypes.STRING, allowNull: false },
            MAT_CODI: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
            MAT_REFE: { type: DataTypes.STRING, allowNull: true },
        }, { tableName: 'MATERIAL', timestamps: false });

        const PrecoVenda = sequelize.define('PrecoVenda', {
            MAT_CODI: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
            TAB_PREC0: { type: DataTypes.FLOAT, allowNull: false },
        }, { tableName: 'PRECOVENDA', timestamps: false });

        const Estoque = sequelize.define('Estoque', {
            MAT_CODI: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
            EST_QUAN: { type: DataTypes.INTEGER, allowNull: false },
        }, { tableName: 'ESTOQUE', timestamps: false });

        const Imagem = sequelize.define('Imagem', {
            MAT_CODI: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
            IMAGEM: { type: DataTypes.STRING, allowNull: true },
        }, { tableName: 'IMAGENS', timestamps: false });

        // Associações
        Material.hasOne(PrecoVenda, { foreignKey: 'MAT_CODI', as: 'precoVenda' });
        PrecoVenda.belongsTo(Material, { foreignKey: 'MAT_CODI', as: 'material' });

        Material.hasOne(Estoque, { foreignKey: 'MAT_CODI', as: 'estoque' });
        Estoque.belongsTo(Material, { foreignKey: 'MAT_CODI', as: 'material' });

        Material.hasOne(Imagem, { foreignKey: 'MAT_CODI', as: 'imagem' });
        Imagem.belongsTo(Material, { foreignKey: 'MAT_CODI', as: 'material' });

        // Consulta
        const result = await Material.findAll({
            attributes: ['MAT_DESC', 'MAT_CODI', 'MAT_REFE'],
            include: [
                { model: PrecoVenda, as: 'precoVenda', attributes: ['TAB_PREC0'], required: false },
                { model: Estoque, as: 'estoque', attributes: ['EST_QUAN'], required: false },
                { model: Imagem, as: 'imagem', attributes: ['IMAGEM'], required: false },
            ],
        });

        // Mapeando o resultado para garantir que os campos nulos sejam tratados corretamente
        const products = result.map(item => ({
            MAT_CODI: item.MAT_CODI.toString(),
            MAT_DESC: item.MAT_DESC.trim(),
            MAT_REFE: item.MAT_REFE ? item.MAT_REFE.trim() : null,
            TAB_PREC0: item.precoVenda ? item.precoVenda.TAB_PREC0 : null,
            EST_QUAN: item.estoque ? item.estoque.EST_QUAN : null
        }));

        res.json(products);  // Retornando os dados no formato JSON para o Kotlin
    } catch (err) {
        console.error('Erro ao buscar dados do banco:', { message: err.message, stack: err.stack });
        res.status(500).send('Erro ao buscar dados do banco');
    }
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}/products`);
});
