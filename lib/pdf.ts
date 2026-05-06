import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { currency } from '@/constants/app-theme';
import { Customer, QuoteItem } from '@/lib/data-context';
import { formatCpfCnpj, formatDatePtBr, formatPhone } from '@/lib/formatters';

type PdfDocumentType = 'orcamento' | 'ordem-servico';

interface PdfDocumentPayload {
  type: PdfDocumentType;
  number: string;
  customerName: string;
  customerDocument: string;
  customerPhone: string;
  items: QuoteItem[];
  notes: string;
  paymentCondition?: string;
  executionDeadline?: string;
  warranty?: string;
  discount?: string;
  total: number;
  createdAt: string;
  customer?: Customer;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const resolveAssetBase64 = async (moduleId: number): Promise<string> => {
  const asset = Asset.fromModule(moduleId);

  if (!asset.localUri) {
    await asset.downloadAsync();
  }

  const uri = asset.localUri ?? asset.uri;
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

  return `data:${mime};base64,${base64}`;
};

const buildServiceOrderFooterHtml = (
  payload: PdfDocumentPayload,
  logoUri: string,
  companyName: string,
) => `
  <div class="service-footer">
    <div class="service-footer-col">
      <div class="service-footer-title">1. RESPONSABILIDADES DA CONTRATADA</div>
      <ul class="service-footer-list">
        <li>Fornecer e utilizar mao de obra habilitada em quantidade suficiente para a execucao dos trabalhos.</li>
        <li>Executar os servicos de acordo com as normas da ABNT, atendendo principalmente os requisitos de seguranca do trabalhador e das instalacoes.</li>
        <li>Cumprir os prazos maximos constantes do cronograma a ser elaborado em comum acordo com as partes, salvo alteracoes ocorridas durante o andamento da obra.</li>
        <li>Fornecer ferramentas e equipamentos de protecao individual necessarios para a execucao ou realizacao dos servicos.</li>
      </ul>
    </div>
    <div class="service-footer-col">
      <div class="service-footer-title">2. RESPONSABILIDADES DO CONTRATANTE</div>
      <ul class="service-footer-list">
        <li>Fornecer todos os documentos e informacoes necessarias a contratada para a correta execucao dos trabalhos e em tempo habil.</li>
        <li>Efetuar o pagamento a ser faturado pela contratada de acordo com as condicoes de pagamento negociadas.</li>
      </ul>
      <div class="service-footer-signature">MONTEC GRUAS E ELEVADORES</div>
    </div>
    <div class="service-footer-col service-footer-acceptance">
      <div class="service-footer-acceptance-head">
        <span class="service-footer-title service-footer-title-inline">3. ACEITE DA PROPOSTA</span>
        <span class="service-footer-date">Data: ${escapeHtml(formatDatePtBr(payload.createdAt))}</span>
      </div>
      <div class="service-footer-watermark">
        <img src="${logoUri}" alt="Montec Gruas" />
      </div>
      <div class="service-footer-client">${escapeHtml(companyName)}</div>
      <div class="service-footer-document">${escapeHtml(formatCpfCnpj(payload.customerDocument || '')) || 'Documento nao informado'}</div>
    </div>
  </div>`;

const buildAdditionalInfoRowsHtml = (payload: PdfDocumentPayload) => `
  <div class="qirow">
    <span class="qilabel">Prazo para<br>Execucao dos Servicos:</span>
    <div class="qival">${escapeHtml(payload.executionDeadline?.trim() || '')}</div>
  </div>
  <div class="qirow">
    <span class="qilabel">Periodo de Garantia:</span>
    <div class="qival">${escapeHtml(payload.warranty?.trim() || '')}</div>
  </div>
  <div class="qirow">
    <span class="qilabel">Condicao de Pagamento:</span>
    <div class="qival">${escapeHtml(payload.paymentCondition?.trim() || '')}</div>
  </div>
  ${payload.discount?.trim() ? `
  <div class="qirow">
    <span class="qilabel">Desconto:</span>
    <div class="qival">${escapeHtml(payload.discount?.trim() ?? '')}</div>
  </div>` : ''}
  <div class="qirow">
    <span class="qilabel">Valor Total:</span>
    <div class="qival qitotal">${currency(payload.total)}</div>
  </div>`;

const buildDocumentHtml = (
  payload: PdfDocumentPayload,
  backgroundUri: string,
  topUri: string,
  logoUri: string,
) => {
  const isQuoteDocument = payload.type === 'orcamento';
  const documentLabel = isQuoteDocument ? 'Orcamento' : 'Ordem de Servi&ccedil;o';
  const companyName = payload.customer?.companyName || 'Nao informado';
  const address = payload.customer?.address || 'Nao informado';
  const district = payload.customer?.district || 'Nao informado';
  const cityUf = payload.customer?.cityUf || 'Nao informado';

  const FIRST_PAGE_ITEM_LIMIT = 6;
  const NEXT_PAGE_ITEM_LIMIT = payload.type === 'ordem-servico' ? 18 : 22;
  const LAST_PAGE_ITEM_LIMIT = payload.type === 'ordem-servico' ? 9 : 16;

  const buildRowsHtml = (items: QuoteItem[], startIndex: number) =>
    items
      .map(
        (item, index) => isQuoteDocument
          ? `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.description || '-')}</td>
            <td>${item.quantity}</td>
            <td>${escapeHtml(item.unit || 'un')}</td>
            <td>${currency(item.unitPrice)}</td>
            <td>${currency(item.quantity * item.unitPrice)}</td>
          </tr>`
          : `
          <tr>
            <td>${startIndex + index + 1}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.description || '-')}</td>
            <td>${escapeHtml(item.unit || 'un')}</td>
            <td>${item.quantity}</td>
            <td>${currency(item.unitPrice)}</td>
            <td>${currency(item.quantity * item.unitPrice)}</td>
          </tr>`,
      )
      .join('');

  const firstPageItems = payload.items.slice(0, FIRST_PAGE_ITEM_LIMIT);
  const remainingItems = payload.items.slice(FIRST_PAGE_ITEM_LIMIT);

  const continuationPages: QuoteItem[][] = [];
  let cursor = 0;

  while (remainingItems.length - cursor > LAST_PAGE_ITEM_LIMIT) {
    continuationPages.push(remainingItems.slice(cursor, cursor + NEXT_PAGE_ITEM_LIMIT));
    cursor += NEXT_PAGE_ITEM_LIMIT;
  }

  if (remainingItems.length - cursor > 0) {
    continuationPages.push(remainingItems.slice(cursor));
  }

  const totalPages = 1 + continuationPages.length;

  const tableHeader = isQuoteDocument
    ? `
    <thead>
      <tr>
        <th>Titulo</th>
        <th>Descricao</th>
        <th>Qtd.</th>
        <th>Und</th>
        <th>Unitario</th>
        <th>Valor Total</th>
      </tr>
    </thead>`
    : `
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th>Descricao</th>
        <th>Unidade</th>
        <th>Qtd.</th>
        <th>Unitario</th>
        <th>Total</th>
      </tr>
    </thead>`;

  const firstPageRowsHtml = buildRowsHtml(firstPageItems, 0);

  const continuationPagesHtml = continuationPages
    .map((pageItems, pageIdx) => {
      const pageNumber = pageIdx + 2;
      const globalStartIndex = FIRST_PAGE_ITEM_LIMIT + continuationPages
        .slice(0, pageIdx)
        .reduce((acc, chunk) => acc + chunk.length, 0);
      const rowsHtml = buildRowsHtml(pageItems, globalStartIndex);
      const isLastPage = pageNumber === totalPages;

      return `
        <section class="page continuation-page ${isQuoteDocument ? 'quote-doc' : 'service-doc'} ${isLastPage ? '' : 'page-break'}">
          <div class="inner continuation-inner">
            <div class="doc-number-row">
              <div class="doc-chip">${documentLabel}: ${escapeHtml(payload.number)} - Continuacao</div>
            </div>

            <table>
              ${tableHeader}
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            ${
              isLastPage
                ? isQuoteDocument
                  ? `
                  <div class="qbot">
                    <div class="qobs">
                      <b>Observacoes:</b>
                      <span class="qobs-text">${escapeHtml(payload.notes || '')}</span>
                    </div>
                    <div class="qinfo">
                      ${buildAdditionalInfoRowsHtml(payload)}
                    </div>
                  </div>
                  `
                  : `
                  <div class="qbot">
                    <div class="qobs">
                      <b>Observacoes:</b>
                      <span class="qobs-text">${escapeHtml(payload.notes || 'Sem observacoes adicionais.')}</span>
                    </div>
                    <div class="qinfo">
                      ${buildAdditionalInfoRowsHtml(payload)}
                    </div>
                  </div>
                  `
                : ''
            }

          </div>
          ${isLastPage && !isQuoteDocument ? buildServiceOrderFooterHtml(payload, logoUri, companyName) : ''}
        </section>`;
    })
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4;
            margin: 0;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            width: 210mm;
            font-family: Arial, Helvetica, sans-serif;
            color: #111111;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .page {
            position: relative;
            width: 210mm;
            height: 297mm;
            box-sizing: border-box;
            background-image: url('${backgroundUri}');
            background-size: 200mm 283mm;
            background-repeat: no-repeat;
            background-position: center -6mm;
            overflow: hidden;
          }

          .quote-doc {
            background-position: center 0;
          }

          .page-break {
            page-break-after: always;
            break-after: page;
          }

          .inner {
            height: 297mm;
            box-sizing: border-box;
            padding: 1mm 22mm 7mm;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          .quote-doc .inner {
            padding: 0 26mm 6mm;
          }

          /* cobre o texto/assinatura gravados na imagem de fundo */
          .service-doc::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 62mm;
            background: #ffffff;
            z-index: 1;
          }
          .service-doc .inner {
            position: relative;
            z-index: 2;
            padding: 1mm 22mm 20mm;
          }

          .continuation-inner {
            padding-top: 8mm;
          }

          .banner {
            width: 100%;
            margin-bottom: 0;
            position: relative;
          }

          .banner img {
            width: 100%;
            display: block;
          }

          .service-doc .banner::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 22%;
            background: #ffffff;
            z-index: 5;
          }

          .banner-title-text {
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            height: 22%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: 900;
            color: #111111;
            letter-spacing: 1px;
            z-index: 6;
            white-space: nowrap;
          }

          .doc-number-row {
            display: flex;
            justify-content: center;
            margin: 0 0 14px;
          }

          .service-order-title {
            text-align: center;
            background: #2f3136;
            color: #ffffff;
            padding: 8px 20px;
            border-radius: 50px;
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 1px;
            margin: 12px auto;
            width: fit-content;
            display: inline-block;
          }

          .quote-doc .doc-number-row {
            display: flex;
            justify-content: flex-end;
            margin: 10px 0 14px;
          }

          .service-doc .doc-chip {
            display: none;
          }

          .doc-chip {
            border-radius: 999px;
            border: 2px solid #111111;
            padding: 5px 14px;
            background: rgba(255, 255, 255, 0.95);
            font-size: 10px;
            font-weight: 800;
          }

          .meta-grid {
            display: flex;
            flex-direction: column;
            gap: 0;
            margin-bottom: 11px;
            width: 94%;
            margin-left: auto;
            margin-right: auto;
          }

          .quote-doc .meta-grid {
            width: 100%;
            margin-left: 0;
            margin-right: 0;
          }

          .meta-row {
            display: flex;
            gap: 8px;
            margin-bottom: 6px;
          }

          .meta-cell {
            flex: 1;
          }

          .meta-cell.full {
            flex: 2;
          }

          .card {
            background: rgba(255, 255, 255, 0.94);
            border: 1px solid #dbdbdb;
            border-radius: 10px;
            padding: 9px 10px;
          }

          .label {
            display: block;
            font-size: 9px;
            text-transform: uppercase;
            color: #8a6a00;
            font-weight: 700;
            margin-bottom: 3px;
          }

          .value {
            font-size: 11px;
            font-weight: 700;
            color: #111111;
          }

          table {
            width: 94%;
            margin: 0 auto;
            border-collapse: collapse;
            background: rgba(255, 255, 255, 0.96);
            border-radius: 10px;
            overflow: hidden;
          }

          .quote-doc table {
            width: 100%;
            margin: 0;
          }

          thead th {
            background: #111111;
            color: #ffffff;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            padding: 8px 6px;
          }

          tbody td {
            padding: 7px 6px;
            font-size: 11px;
            border-bottom: 1px solid #ececec;
          }

          tbody tr:nth-child(even) {
            background: #faf7ee;
          }

          .service-footer {
            width: 70%;
            margin: 8px auto 0;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            background: #efefef;
            height: 26mm;
            min-height: 26mm;
            max-height: 26mm;
            border: 1px solid #cfcfcf;
            box-sizing: border-box;
            overflow: hidden;
          }

          .service-doc .service-footer {
            position: absolute;
            bottom: 44mm;
            left: 50%;
            transform: translateX(-50%);
            margin-top: 0;
            margin-bottom: 0;
            z-index: 3;
          }

          .service-footer-col {
            padding: 1.8mm 1.8mm 1.2mm;
            border-right: 1px solid #bdbdbd;
            box-sizing: border-box;
            overflow: hidden;
          }

          .service-footer-col:last-child {
            border-right: 0;
          }

          .service-footer-title {
            display: inline-block;
            background: #2f3136;
            color: #ffffff;
            border-radius: 4px;
            padding: 1px 5px;
            font-size: 4px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 1.2mm;
            letter-spacing: 0.2px;
          }

          .service-footer-title-inline {
            margin-bottom: 0;
          }

          .service-footer-list {
            margin: 0;
            padding: 0;
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 0;
          }

          .service-footer-list li {
            position: relative;
            padding: 0.8mm 0 0.8mm 5px;
            font-size: 3.8px;
            line-height: 1.1;
            font-weight: 700;
            color: #202020;
            text-transform: uppercase;
            border-bottom: 1px solid #cdcdcd;
          }

          .service-footer-list li:last-child {
            border-bottom: 0;
          }

          .service-footer-list li::before {
            content: '';
            position: absolute;
            left: 0;
            top: 1.8mm;
            width: 3px;
            height: 3px;
            background: #f0b126;
          }

          .service-footer-signature {
            margin-top: 0.8mm;
            padding-top: 0.8mm;
            border-top: 1px solid #7a7a7a;
            text-align: center;
            font-size: 4px;
            font-weight: 900;
            letter-spacing: 0.2px;
          }

          .service-footer-acceptance {
            display: flex;
            flex-direction: column;
          }

          .service-footer-acceptance-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 3px;
            margin-bottom: 1.2mm;
          }

          .service-footer-date {
            font-size: 4.6px;
            font-weight: 700;
            white-space: nowrap;
            padding-top: 1px;
          }

          .service-footer-watermark {
            flex: 1;
            min-height: 8mm;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.02);
            border-left: 2px solid #f0b126;
            border-right: 2px solid #f0b126;
            margin-bottom: 0.8mm;
          }

          .service-footer-watermark img {
            width: 78%;
            opacity: 0.16;
            display: block;
          }

          .service-footer-client,
          .service-footer-document {
            text-align: center;
            font-weight: 700;
            color: #555555;
          }

          .service-footer-client {
            padding-top: 0.6mm;
            border-top: 1px solid #8b8b8b;
            font-size: 7px;
            min-height: 8px;
          }

          .service-footer-document {
            font-size: 6px;
            margin-top: 0.6mm;
          }

          /* ── Orcamento: client rows ── */
          .quote-doc .doc-number-row { display: none; }
          .qcr { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
          .qr  { display: flex; gap: 5px; }
          .qf  {
            flex: 1;
            border: 1px solid #c8c8c8;
            border-radius: 6px;
            background: #f5f5f5;
            padding: 3px 8px;
            font-size: 10px;
            display: flex;
            align-items: center;
            min-height: 18px;
            color: #111;
          }
          .qf b { font-weight: 800; margin-right: 3px; white-space: nowrap; }
          .qf3  { flex: 3; }
          .qf2  { flex: 2; }
          .qf1  { flex: 1; }

          /* ── Orcamento: bottom section ── */
          .qbot { margin-top: 10px; display: flex; gap: 12px; }
          .service-doc .qbot { width: 94%; margin-left: auto; margin-right: auto; }
          .qobs {
            flex: 1;
            border: 1px solid #c8c8c8;
            border-radius: 6px;
            background: #f5f5f5;
            padding: 8px 10px;
            font-size: 10px;
            display: flex;
            flex-direction: column;
          }
          .qobs b { font-weight: 800; display: block; margin-bottom: 5px; }
          .qobs-text { font-size: 10px; color: #333; line-height: 1.4; }
          .qinfo {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            gap: 8px;
          }
          .qirow { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
          .qilabel { font-size: 10px; font-weight: 800; text-align: right; color: #111; line-height: 1.25; }
          .qival {
            width: 130px;
            min-height: 18px;
            border: 1px solid #c8c8c8;
            border-radius: 6px;
            background: #f5f5f5;
            padding: 3px 7px;
            font-size: 10px;
            display: flex;
            align-items: center;
          }
          .qitotal { background: #fff; font-size: 14px; font-weight: 900; color: #c99a00; }

        </style>
      </head>
      <body>
        <section class="page ${isQuoteDocument ? 'quote-doc' : 'service-doc'} ${continuationPages.length > 0 ? 'page-break' : ''}">
          <div class="inner">
            <div class="banner">
              <img src="${topUri}" alt="Montec Gruas" />
              ${!isQuoteDocument ? '<div class="banner-title-text">ORDEM DE SERVIÇO</div>' : ''}
            </div>

            <div class="doc-number-row">
              <div class="doc-chip">${documentLabel}: ${escapeHtml(payload.number)}</div>
            </div>

            ${isQuoteDocument ? `
            <div class="qcr">
              <div class="qr">
                <div class="qf qf3"><b>Cliente:</b> ${escapeHtml(payload.customerName)}</div>
                <div class="qf qf1"><b>Data:</b> ${escapeHtml(formatDatePtBr(payload.createdAt))}</div>
              </div>
              <div class="qr">
                <div class="qf qf3"><b>Orcamento:</b> ${escapeHtml(payload.number)}</div>
                <div class="qf qf2"><b>Telefone:</b> ${escapeHtml(formatPhone(payload.customerPhone || '')) || 'Nao informado'}</div>
              </div>
              <div class="qr">
                <div class="qf qf3"><b>Razao Social:</b> ${escapeHtml(companyName)}</div>
                <div class="qf qf2"><b>CPF/CNPJ:</b> ${escapeHtml(formatCpfCnpj(payload.customerDocument || '')) || ''}</div>
              </div>
              <div class="qr">
                <div class="qf qf1"><b>Endereco:</b> ${escapeHtml(address)}</div>
              </div>
              <div class="qr">
                <div class="qf qf1"><b>Bairro:</b> ${escapeHtml(district)}</div>
                <div class="qf qf1"><b>Cidade:</b> ${escapeHtml(cityUf)}</div>
              </div>
            </div>
            ` : `
            <div class="qcr">
              <div class="qr">
                <div class="qf qf3"><b>Cliente:</b> ${escapeHtml(payload.customerName)}</div>
                <div class="qf qf1"><b>Data:</b> ${escapeHtml(formatDatePtBr(payload.createdAt))}</div>
              </div>
              <div class="qr">
                <div class="qf qf3"><b>Razao Social:</b> ${escapeHtml(companyName)}</div>
                <div class="qf qf2"><b>CPF/CNPJ:</b> ${escapeHtml(formatCpfCnpj(payload.customerDocument || '')) || ''}</div>
              </div>
              <div class="qr">
                <div class="qf qf1"><b>Endereco:</b> ${escapeHtml(address)}</div>
              </div>
              <div class="qr">
                <div class="qf qf1"><b>Bairro:</b> ${escapeHtml(district)}</div>
                <div class="qf qf1"><b>Cidade:</b> ${escapeHtml(cityUf)}</div>
              </div>
              <div class="qr">
                <div class="qf qf1"><b>Telefone:</b> ${escapeHtml(formatPhone(payload.customerPhone || '')) || 'Nao informado'}</div>
              </div>
            </div>
            `}

            <table>
              ${tableHeader}
              <tbody>
                ${firstPageRowsHtml}
              </tbody>
            </table>

            ${
              continuationPages.length === 0
                ? isQuoteDocument
                  ? `
                  <div class="qbot">
                    <div class="qobs">
                      <b>Observacoes:</b>
                      <span class="qobs-text">${escapeHtml(payload.notes || '')}</span>
                    </div>
                    <div class="qinfo">
                      ${buildAdditionalInfoRowsHtml(payload)}
                    </div>
                  </div>
                  `
                  : `
                  <div class="qbot">
                    <div class="qobs">
                      <b>Observacoes:</b>
                      <span class="qobs-text">${escapeHtml(payload.notes || 'Sem observacoes adicionais.')}</span>
                    </div>
                    <div class="qinfo">
                      ${buildAdditionalInfoRowsHtml(payload)}
                    </div>
                  </div>
                  `
                : ''
            }

          </div>
          ${!isQuoteDocument && continuationPages.length === 0 ? buildServiceOrderFooterHtml(payload, logoUri, companyName) : ''}
        </section>

        ${continuationPagesHtml}
      </body>
    </html>`;
};

export const shareDocumentPdf = async (payload: PdfDocumentPayload) => {
  const [backgroundUri, topUri, logoUri] = await Promise.all([
    resolveAssetBase64(require('@/assets/branding/orcamento_modelo.jpg')),
    resolveAssetBase64(require('@/assets/branding/orcamento_top.jpg')),
    resolveAssetBase64(require('@/assets/branding/logo.png')),
  ]);

  const html = buildDocumentHtml(payload, backgroundUri, topUri, logoUri);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return null;
  }

  const { uri } = await Print.printToFileAsync({ html });

  const firstName = payload.customerName.trim().split(/\s+/)[0];
  const safeName  = `${payload.number}-${firstName}`.replace(/[^a-zA-Z0-9\-_]/g, '_');
  const dir       = uri.substring(0, uri.lastIndexOf('/'));
  const namedUri  = `${dir}/${safeName}.pdf`;

  await FileSystem.moveAsync({ from: uri, to: namedUri });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(namedUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Compartilhar ${payload.number}`,
      UTI: 'com.adobe.pdf',
    });
  }

  return namedUri;
};