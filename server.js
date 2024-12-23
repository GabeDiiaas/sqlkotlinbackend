const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Configuração do banco de dados
const defaultDbConfig = {
    user: 'usuario Kotlin',
    password: '12345',
    server: '192.168.1.16',  // IP padrão, será substituído se um IP for fornecido
    database: 'Banco_teste',
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

// Rota para buscar os produtos
app.get('/products', async (req, res) => {
    const { ip } = req.query;  // Recupera o IP da query string
   
    if (!ip) {
        return res.status(400).send('IP da máquina é obrigatório');
    }

    const dbConfig = {
        ...defaultDbConfig,
        server: ip,  // Substitui o IP padrão pelo IP recebido
    };

    try {
        let pool = await sql.connect(dbConfig);
        
        // Consulta SQL com as tabelas e campos solicitados
        const query = `
            SELECT
                M.MAT_DESC,
                M.MAT_CODI,
                M.MAT_REFE,
                P.TAB_PREC0,
                E.EST_QUAN,
                I.IMAGEM
            FROM
                MATERIAL AS M
            JOIN
                PRECOVENDA AS P ON M.MAT_CODI = P.MAT_CODI
            JOIN
                ESTOQUE AS E ON M.MAT_CODI = E.MAT_CODI
            LEFT JOIN
                IMAGENS AS I ON M.MAT_CODI = I.MAT_CODI
        `;

        let result = await pool.request().query(query);  // Executa a consulta SQL

        // Envia o resultado como JSON
        res.json(result.recordset);
    } catch (err) {
        console.error('Erro ao buscar dados:', err);
        res.status(500).send('Erro ao buscar dados do banco');
    }
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
