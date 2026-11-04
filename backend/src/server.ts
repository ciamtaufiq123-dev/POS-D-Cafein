import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server POS D\'Cafein berjalan di http://localhost${PORT}`)
})