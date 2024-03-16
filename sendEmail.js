const nodemailer = require('nodemailer')
require('dotenv/config')

module.exports = async (email, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USERNAME,
            to: email,
            subject: subject,
            text: text
        })
        console.log("Email sent succesfully");
    } catch (error) {
        console.log("Email not sent");
        console.log(error)
    }
}