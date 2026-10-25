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


export const enviarCorreoRecuperacion = async (correo: string, token: string) => {
    const enlace = `http://localhost:9000/restablecer-contrasena/${token}`;

    //cuerpo del correo
    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: correo,
        subject: "Recuperación de contraseña - Sistema de turnos",
        html: `
            <h2>¿Olvidaste tu contraseña?</h2>
            <p>Recibimos un pedido para restablecer tu contraseña. Si fuiste vos, hacé clic en el siguiente enlace (válido por 1 hora):</p>
            <a href="${enlace}">Restablecer contraseña</a>
            <p>Si no fuiste vos, podés ignorar este correo.</p>
        `,
    })
}