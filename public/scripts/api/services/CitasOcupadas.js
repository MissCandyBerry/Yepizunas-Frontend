// public/scripts/api/services/CitasOcupadas.js
const API_URL = 'https://localhost:7225/api/Cita'; 

export async function obtenerCitasOcupadas() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al obtener las citas');
        
        const jsonResponse = await response.json();
        
        return jsonResponse.data || []; 
        
    } catch (error) {
        console.error("Error conectando al servidor:", error);
        return [];
    }
}