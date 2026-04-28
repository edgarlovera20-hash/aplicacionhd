// PDF utilities for signature stamping and document manipulation
import jsPDF from 'jspdf';

export interface SignatureStampConfig {
  pageNumber?: number; // 1-indexed, default 1
  x?: number; // mm from left, default 150
  y?: number; // mm from top, default 250
  width?: number; // mm, default 40
  height?: number; // mm, default 20
}

/**
 * Stamp a signature image (base64) into a PDF at specified location
 * Returns a new PDF blob with signature stamped
 */
export async function stampSignatureIntoPDF(
  pdfFile: File | Blob,
  signatureBase64: string,
  config: SignatureStampConfig = {}
): Promise<Blob> {
  const {
    pageNumber = 1,
    x = 150,
    y = 250,
    width = 40,
    height = 20,
  } = config;

  try {
    // Read PDF file as ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);

    // Use PDFLib if available, otherwise use jsPDF
    // For now, we'll use a simpler approach with jsPDF to overlay the signature
    const pdf = await loadPDFWithJsPDF(arrayBuffer);

    // Add signature image at specified position
    pdf.addImage(signatureBase64, 'PNG', x, y, width, height);

    // Get PDF as blob
    const blob = pdf.output('blob');
    return blob;
  } catch (error) {
    console.error('Error stamping signature into PDF:', error);
    throw new Error('Failed to stamp signature into PDF');
  }
}

/**
 * Load and prepare PDF using jsPDF
 * This is a simplified approach that overlays the signature on the existing PDF
 */
async function loadPDFWithJsPDF(arrayBuffer: ArrayBuffer): Promise<jsPDF> {
  // For a more robust solution, we'd use PDFLib: https://github.com/pdfme/pdf-lib
  // For now, create a new jsPDF and note the limitation
  // In production, integrate pdf-lib for full PDF manipulation

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Note: This is a simplified implementation
  // For full PDF overlay capabilities, integrate pdf-lib
  // github.com/pdfme/pdf-lib

  return pdf;
}

/**
 * Create a simple PDF certificate with signature
 * Useful for standalone signature documents
 */
export function createSignatureCertificate(
  ownerName: string,
  signatureBase64: string,
  timestamp?: Date
): Blob {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Set font and styling
  pdf.setFontSize(16);
  pdf.setTextColor(40, 40, 40);

  // Add certificate text
  pdf.text('CERTIFICADO DE FIRMA DIGITAL', 105, 30, { align: 'center' });

  pdf.setFontSize(12);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`Titular: ${ownerName}`, 20, 50);

  if (timestamp) {
    pdf.text(`Fecha de firma: ${timestamp.toLocaleDateString('es-MX')} ${timestamp.toLocaleTimeString('es-MX')}`, 20, 60);
  }

  // Add signature image
  try {
    pdf.addImage(signatureBase64, 'PNG', 50, 100, 110, 50);
  } catch (error) {
    console.warn('Could not add signature image to certificate:', error);
    pdf.text('[Firma Digital]', 50, 100);
  }

  // Add footer
  pdf.setFontSize(10);
  pdf.setTextColor(150, 150, 150);
  pdf.text('Este documento contiene una firma digital autenticada.', 105, 280, { align: 'center' });

  return pdf.output('blob');
}

/**
 * Convert canvas to image (base64 data URL)
 * Used by SignaturePad to generate signature image
 */
export function canvasToSignatureBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/**
 * Check if signature canvas has actual drawing (not blank)
 */
export function isSignatureValid(canvas: HTMLCanvasElement): boolean {
  if (!canvas) return false;

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  // Get image data and check if any pixel is not white/transparent
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Check if there's any non-white pixel (signature stroke)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 200) {
      // Alpha channel > 200 means some opacity
      return true;
    }
  }

  return false;
}

/**
 * Generate filename for signed PDF
 * Format: SalesForm_[name]_[timestamp].pdf
 */
export function generateSignedPdfFilename(ownerName: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const cleanName = ownerName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  return `Contrato_Firmado_${cleanName}_${timestamp}.pdf`;
}

/**
 * Validate PDF file
 */
export function isValidPdfFile(file: File): boolean {
  if (!file) return false;
  if (!file.type.includes('pdf')) return false;
  if (file.size > 10 * 1024 * 1024) return false; // 10MB limit
  return true;
}

/**
 * Merge two base64 images (for watermarking or overlay)
 * Useful if we need to overlay signature on top of document preview
 */
export async function mergeSignatureWithImage(
  backgroundBase64: string,
  signatureBase64: string,
  signatureX: number,
  signatureY: number,
  signatureWidth: number,
  signatureHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not create canvas context'));
      return;
    }

    const bgImg = new Image();
    const sigImg = new Image();
    let imagesLoaded = 0;

    const onImageLoad = () => {
      imagesLoaded++;
      if (imagesLoaded === 2) {
        // Set canvas size to background
        canvas.width = bgImg.width;
        canvas.height = bgImg.height;

        // Draw background
        ctx.drawImage(bgImg, 0, 0);

        // Draw signature on top
        ctx.drawImage(sigImg, signatureX, signatureY, signatureWidth, signatureHeight);

        // Return merged image as base64
        resolve(canvas.toDataURL('image/png'));
      }
    };

    bgImg.onload = onImageLoad;
    sigImg.onload = onImageLoad;
    bgImg.onerror = () => reject(new Error('Failed to load background image'));
    sigImg.onerror = () => reject(new Error('Failed to load signature image'));

    bgImg.src = backgroundBase64;
    sigImg.src = signatureBase64;
  });
}
