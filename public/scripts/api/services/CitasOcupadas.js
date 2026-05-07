// ✅ Después
const API_URL = 'http://localhost:5212/api/Cita';

export async function obtenerCitasOcupadas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Error al obtener las citas');
        const jsonResponse = await response.json();
        return jsonResponse.data || [];
    } catch (error) {
        console.error("Error conectando al servidor:", error);
        return [];
    }
}