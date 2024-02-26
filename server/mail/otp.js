import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    auth: {
        user: process.env.MAIL_EMAIL,
        pass: process.env.MAIL_SECRET
    }
});

const sendOTP = ({ to, otp }) => {
    const html = generateOTPTemplate(otp);
    const subject = 'Your OTP from GE CoPilot™';

    const options = {
        from: `GE CoPilot™ <${process.env.MAIL_EMAIL}>`,
        to,
        subject,
        html
    };

    transporter.sendMail(options, (err, info) => {
        if (err) {
            console.error(err);
        } else {
            console.log('Email sent: ', info.response);
        }
    });
};

const generateOTPTemplate = (otp) => {
    const template = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>OTP from GE CoPilot™</title>
        </head>
        <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;padding: 2rem;height: auto;">
            <main style="background: #FFFFFF;">
                <div>
                    <img src="https://uc4ebbba55f4776046824cd723b8.previews.dropboxusercontent.com/p/thumb/ACJy78Rx5xFoKwH1Q0SpXhLgqHEC_g90hKpgB4YfIy7Mj79tcVlppmWayy-zCdqMM27dEynS9lCb6rYBMANkNAqwPDYimuLZ8-VFjxnuwCrt_l8PznSOvtfkiwWEt92ojTOaLFtFgr9ZqWags5BDvmHqBRQuKDkX-kJLOEWxbTby3Y95fSyhAfFHQlfD4c_1QLq49RANt3G2b0_RcnB5IDhQrbjaM6-g4rXWtnYpFtMmSLYzJ02EgHPyYzWbqxh0t25cAAh-MtKrCu0Mp5EIukptvgNlmU5hpSAAYBe0aB-9RxQuB9js4JYivIVEg7Dt8l_FSgVP0x71XX1eM6rMBLThcy7X1sSve04RCf5Kp1qCx2G_S_vRRPLubuXObBFOqgU/p.jpeg" width="560" height="168" alt="OpenAI" title="" style="width:140px;height:auto;border:0;line-height:100%;outline:none;text-decoration:none" class="CToWUd" data-bit="iit">
                    <h1 style="color: #202123;font-size: 32px;line-height: 40px;">Your OTP is: ${otp}</h1>
                    <p style="color: #353740;font-size: 16px;line-height: 24px;margin-bottom: 1.8rem;">Use this OTP to proceed with your action.</p>
                </div>
            </main>
        </body>
        </html>
    `;

    return template;
};

export default sendOTP;
