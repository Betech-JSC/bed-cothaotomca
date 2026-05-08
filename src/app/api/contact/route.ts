import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getSmtpSettings } from '@/services/smtpService';
import { postApi } from '@/services/apiService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, message } = body;

    // 1. Lưu vào backend API trước (Quan trọng nhất)
    let savedToBackend = false;
    try {
      await postApi('contacts', body);
      savedToBackend = true;
    } catch (error) {
      console.error('Error saving contact to backend:', error);
      // Nếu không lưu được vào DB thì mới báo lỗi cho khách
      return NextResponse.json(
        { success: false, message: 'Không thể lưu thông tin liên hệ. Vui lòng thử lại sau.' },
        { status: 500 }
      );
    }

    // 2. Gửi email thông báo (Chạy trong try-catch riêng để không chặn quy trình nếu lỗi SMTP)
    if (savedToBackend) {
      try {
        const smtp = await getSmtpSettings().catch(() => null);

        if (smtp && smtp.host && smtp.user && smtp.pass) {
          const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: Number(smtp.port),
            secure: smtp.encryption === 'ssl' || Number(smtp.port) === 465,
            auth: {
              user: smtp.user,
              pass: smtp.pass,
            },
            // Tăng timeout để tránh treo request
            connectionTimeout: 10000, 
          });

          const mailOptions = {
            from: `"${smtp.from_name || 'Website Contact'}" <${smtp.user}>`,
            to: [smtp.mail_to, smtp.company_email].filter(Boolean).join(','),
            subject: `[Liên hệ mới] - ${name}`,
            html: `
              <h3>Thông tin liên hệ mới từ website</h3>
              <p><strong>Họ tên:</strong> ${name}</p>
              <p><strong>Số điện thoại:</strong> ${phone}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Nội dung:</strong></p>
              <p>${message.replace(/\n/g, '<br>')}</p>
              <hr>
              <p>Đây là email tự động từ hệ thống website Cô Thảo Tôm Cá.</p>
            `,
            replyTo: email,
          };

          await transporter.sendMail(mailOptions);
          console.log('Email sent successfully');
        }
      } catch (mailError) {
        // Chỉ log lỗi mail, không chặn response trả về cho khách
        console.error('Email sending failed, but contact was saved:', mailError);
      }
    }

    return NextResponse.json({ success: true, message: 'Gửi liên hệ thành công!' });
  } catch (error: any) {
    console.error('Contact API Global Error:', error);
    return NextResponse.json(
      { success: false, message: 'Có lỗi xảy ra. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
