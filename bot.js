import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.use(bodyParser.json());

// Manejador de comandos
const comandos = {
    "/cotizar": "📋 Para cotizar, por favor indicá tu edad y el monto que querés invertir.",
    "/renta": "📊 Te explicamos en simples pasos cómo invertir y qué rendimiento podés esperar.",
    "/seguridad": "🔒 Es un producto del Banco de Seguros del Estado con respaldo estatal y tasas en dólares.",
    "/cobro": "📆 Depende del plazo que elijas. Te lo detallamos según tu caso.",
    "/llamar": "☎️ Dejanos tu número y un horario, y uno de nuestros asesores se contactará con vos.",
    "default": "❓ Comando no reconocido. Probá con /cotizar, /renta o /seguridad."
};

// Verificación del webhook
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verificado");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Recepción de mensajes
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object) {
        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        const from = message?.from;

        let text = message?.text?.body?.trim();
        const buttonReply = message?.interactive?.button_reply?.id;

        if (buttonReply) text = buttonReply;

        if (text && from) {
            console.log(`📩 Mensaje recibido: "${text}" de ${from}`);
            const respuesta = comandos[text.toLowerCase()] || comandos["default"];
            await responderMensaje(from, respuesta);

            // También podés enviar menú luego del primer mensaje
            if (text.toLowerCase() === "hola" || text.toLowerCase() === "menú") {
                await enviarMenuInicial(from);
            }
        }

        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// Enviar mensaje simple
async function responderMensaje(to, message) {
    try {
        await axios.post(
            `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: to,
                type: "text",
                text: { body: message }
            },
            {
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log(`✅ Mensaje enviado a ${to}: ${message}`);
    } catch (error) {
        console.error("❌ Error al enviar mensaje:", error.response?.data || error.message);
    }
}

// Enviar menú de botones
async function enviarMenuInicial(to) {
    try {
        await axios.post(
            `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: to,
                type: "interactive",
                interactive: {
                    type: "button",
                    body: {
                        text: "📩 Elegí una opción:"
                    },
                    action: {
                        buttons: [
                            { type: "reply", reply: { id: "/cotizar", title: "💼 Cotizar" } },
                            { type: "reply", reply: { id: "/renta", title: "📊 Renta Personal" } },
                            { type: "reply", reply: { id: "/seguridad", title: "🔒 Seguridad" } }
                        ]
                    }
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );
    } catch (error) {
        console.error("❌ Error al enviar menú:", error.response?.data || error.message);
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
