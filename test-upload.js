const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
  try {
    const form = new FormData();
    form.append('nom_prod', 'Zapatilla Cloudinary Test');
    form.append('descrip_prod', 'Zapatilla de prueba generada para validar el pipeline de Cloudinary');
    form.append('precio_unitario', '129.99');
    form.append('stock_actual', '50');
    
    // Adjuntamos la imagen generada
    const imagePath = '/home/ruben/.gemini/antigravity/brain/e4e075ce-0bcd-4aed-bd87-d39dbfa9803f/zapatilla_prueba_1775346262287.png';
    form.append('imagen', fs.createReadStream(imagePath));

    console.log('Enviando petición a la API Gateway...');
    
    // NOTA: Ajusta el puerto si tu gateway no corre en 3000
    const response = await axios.post('http://localhost:3000/api/products', form, {
      headers: {
        ...form.getHeaders()
      }
    });

    console.log('✅ Éxito! Respuesta del servidor:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error en la prueba:');
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testUpload();
