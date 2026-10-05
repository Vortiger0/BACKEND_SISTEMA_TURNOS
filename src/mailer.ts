import "dotenv/config";
import nodemailer from "nodemailer";
//se define el transporter en el cual se configura la cuenta y el servidor con el que se mandarán los correos para verificación
export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});


//lo que hace esta función es recibir el correo y el token del usuario y enviarle un correo con un enlace para verificar su cuenta
export const enviarCorreoVerificacion = async ( correo: string, token: string) => {
    const enlace = `http://localhost:${process.env.PUERTO}/api/auth/verificar/${token}`;

    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: correo,
        subject: "Verificá tu cuenta - Sistema de turnos",
        html: `<p>Gracias por registrarte. Por favor, haz clic en el siguiente enlace para verificar tu correo electrónico:</p>
               <a href="${enlace}">Verificar mi cuenta</a>`

    })
}