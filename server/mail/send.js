import nodemailer from 'nodemailer'
import dotnet from 'dotenv'

dotnet.config()

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host:"smtp.gmail.com",
    auth: {
        user: process.env.MAIL_EMAIL,
        pass: process.env.MAIL_SECRET
    }
})

export default ({ to, subject, html }) => {
    var options = {
        from: `GE CoPilot™ <${process.env.MAIL_EMAIL}>`,
        to,
        subject,
        html
    }

    transporter.sendMail(options, function (err, done) {
        if (err) {
            console.log(err);
        } else {
            console.log('Email sent: ', done?.response);
        }
    });
}