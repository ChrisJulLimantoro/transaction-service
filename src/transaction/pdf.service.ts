import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import puppeteer from 'puppeteer';
import * as QRCode from 'qrcode';

@Injectable()
export class PdfService {
  private storagePath = path.join(__dirname, '..', '..', 'storage', 'notas');

  constructor() {
    fs.ensureDirSync(this.storagePath); // Ensure folder exists
  }

  formatCurrency(value: number | string): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(Number(value));
  }

  formatDate(value: Date | string): string {
    return new Intl.DateTimeFormat('id-ID').format(new Date(value));
  }

  formatPhone(phone: string): string {
    return phone.replace(/(\d{2})(\d{3})(\d{4})(\d{4})/, '0$2-$3-$4');
  }

  formatPaymentMethod(method: number): string {
    switch (method) {
      case 1:
        return 'CASH';
      case 2:
        return 'BANK TRANSFER';
      case 3:
        return 'CREDIT CARD';
      case 4:
        return 'DEBIT CARD';
      default:
        return 'MARKETPLACE';
    }
  }

  getTransType(type: number): string {
    switch (type) {
      case 1:
        return 'SALES';
      case 2:
        return 'PURCHASE';
      case 3:
        return 'TRADE';
    }
  }

  async generateSalesNota(transaction: any): Promise<string> {
    const dataQrTrans = `${transaction.code};${transaction.id}`;
    const qrTrans = await this.generateQRCode(dataQrTrans);

    await Promise.all(
      transaction.transaction_products.map(async (item) => {
        if (item.product_code_id != null) {
          item.qr = await this.generateQRCode(
            item.name.split(' - ')[0] + ';' + item.product_code_id,
          );
        } else {
          item.qr = null;
        }
      }),
    );

    // Process transaction operations
    await Promise.all(
      transaction.transaction_operations.map(async (item) => {
        item.qr = await this.generateQRCode(
          item.name.split(' - ')[0] + ';' + item.operation_id,
        );
      }),
    );

    const voucherDiscount =
      Number(transaction.sub_total_price) +
      Number(transaction.tax_price) -
      Number(transaction.total_price);

    var htmlContent = `
    <!doctype html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Invoice</title>
        <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            background-color: #f9f9f9;
        }
        .container {
            max-width: 800px;
            background: white;
            padding: 20px;
            margin: auto;
            border-radius: 8px;
            box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #ddd;
            padding-bottom: 10px;
        }
        .info,
        .order-details {
            font-size: 14px;
            margin-top: 8px;
        }
        .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .qr-trans img {
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        h4 {
            margin-top: 20px;
            font-size: 16px;
        }
        .table {
            width: 100%;
            margin-top: 15px;
            border-collapse: collapse;
        }
        .table th,
        .table td {
            border: 1px solid #ddd;
            padding: 10px;
            font-size: 12px;
            text-align: left;
            // word-break: break-word;
            // white-space: normal;
            // overflow-wrap: break-word;
        }
        .table th {
            background-color: #f4f4f4;
            font-weight: bold;
        }
        .item-code {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .total-section {
            margin-top: 20px;
            text-align: right;
            font-size: 14px;
            font-weight: bold;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            text-align: right;
            color: #555;
        }
        </style>
    </head>
    <body>
        <div class="container">
        <!-- Header -->
        <div class="header">
            <div>
                <div class="title">#${transaction.code}</div>
                <div class="title">${this.getTransType(transaction.transaction_type)}</div>
                <!-- Order Details -->
                <div class="order-details">
                    <div><strong>Order Date:</strong> ${this.formatDate(transaction.date)}</div>
                    <div><strong>Sales person:</strong> ${transaction.employee?.name ?? 'Marketplace'}</div>
                </div>
            <!-- Customer Info -->
                <div class="info">
                    <strong>Kepada: </strong><br />
                    ${transaction.customer.name}<br />
                    ${transaction.customer.email}<br />
                    ${transaction.customer.phone}<br />
                </div>
            </div>
            <!-- QR Code -->
            <div class="qr-trans">
                <img
                src="${qrTrans}"
                    width="80"
                    height="80"
                />
            </div>
        </div>

        <h4>Detail Transaksi</h4>
        <!-- Table -->
        <table class="table">
            <thead>
            <tr>
                <th width="15%">Code</th>
                <th>Barang</th>
                <th>Kategori</th>
                <th>Quantity</th>
                <th><div class="right">Subtotal</div></th>
            </tr>
            </thead>
            <tbody>
                <tbody>
                ${transaction.transaction_products
                  .map(
                    (item) =>
                      `            
                <tr>
                    <td>
                    <div class="item-code">` +
                      (item.qr != null
                        ? `<img src="${item.qr}" width="50" height="50" />`
                        : '') +
                      `<i>${item.name.split(' - ')[0]}</i>
                    </div>
                    </td>
                    <td>${item.name.split(' - ')[1] ?? 'Outside Product'}</td>
                    <td>${item.type}</td>
                    <td>${item.weight} gr</td>
                    <td><div class="right">${this.formatCurrency(item.total_price)}</div></td>
                </tr>`,
                  )
                  .join('')}
                ${transaction.transaction_operations
                  .map(
                    (item) => `            
                <tr>
                    <td><div class="item-code">
                    <img src="${item.qr}" width="50" height="50" />
                    <i>${item.name.split(' - ')[0]}</i>
                    </div></td>
                    <td>${item.name.split(' - ')[1]}</td>
                    <td>${item.type}</td>
                    <td>${item.unit} ${item.operation.uom}</td>
                    <td><div class="right">${this.formatCurrency(item.total_price)}</div></td>
                </tr>`,
                  )
                  .join('')}
                </tbody>
        </table>


        <!-- Total Section -->
        <div class="total-section">
            <div>SubTotal: <strong>${this.formatCurrency(transaction.sub_total_price)}</strong></div>`;
    if (transaction.transaction_type == 3) {
      htmlContent += `<div>Trade In Fee: <strong>${this.formatCurrency(transaction.adjustment_price)}</strong></div>`;
    }
    if (transaction.transaction_type != 2) {
      htmlContent += `<div>Taxes: <strong>${this.formatCurrency(transaction.tax_price)}</strong></div>`;
    }
    if (transaction.payment_link != null) {
      htmlContent += `<div>Poin Earned: <strong>${transaction.poin_earned}</strong></div>
            <div>Voucher Discount: <strong>-${this.formatCurrency(voucherDiscount)}</strong></div>`;
    }
    htmlContent += `<hr />
            <div><strong>Total: ${this.formatCurrency(transaction.total_price)}</strong></div>
        </div>

        <p><strong>Payment Method:</strong> ${this.formatPaymentMethod(transaction.payment_method)}</p>
        <div class="footer">
            <div class="info">
                <strong>${transaction.store.code} | ${transaction.store.name}</strong><br />
                ${transaction.store?.address ?? 'Unlisted'}<br />
                ${transaction.store?.wa_number == null ? '081xxxxxxxxxx' : this.formatPhone(transaction.store?.wa_number)}<br />
            <br />
            </div>
        </div>
        </div>
        <!-- Data -->
    </body>
    </html>
`;

    return new Promise(async (resolve, reject) => {
      const filePath = path.join(
        this.storagePath,
        `${Date.now()}-${transaction.id}.pdf`,
      );

      try {
        // Launch Puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Set HTML content
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // Generate PDF
        await page.pdf({
          path: filePath,
          format: 'A4',
          printBackground: true,
        });

        // Close browser
        await browser.close();

        // Return the file path
        resolve(filePath);
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateQRCode(data: string) {
    return await QRCode.toDataURL(data);
  }
}
