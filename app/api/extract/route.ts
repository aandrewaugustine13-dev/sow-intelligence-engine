import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const extractSchema = z.object({
  vendorName: z.string(),
  title: z.string(),
  paymentTerms: z.string(),
  hasDataPrivacyClause: z.boolean(),
  hasIpTransferClause: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use generateObject with the Google AI SDK
    const { object } = await generateObject({
      model: google('gemini-1.5-pro'),
      schema: extractSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the contract information from this PDF.' },
            { type: 'file', data: buffer.toString("base64"), mimeType: 'application/pdf' }
          ]
        }
      ]
    });

    // Evaluate the extracted data
    let status = 'approved';
    if (
      object.paymentTerms.includes('90') ||
      !object.hasDataPrivacyClause ||
      !object.hasIpTransferClause
    ) {
      status = 'flagged';
    }

    const result = {
      ...object,
      status,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error processing PDF:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
