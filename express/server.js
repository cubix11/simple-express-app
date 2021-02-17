const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;
const router = require('./routes');


app.use(router);
app.listen(PORT, () => console.log('Listening on port', PORT));