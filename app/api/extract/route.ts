import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `Extract the contract information from the attached PDF. 
    You must return ONLY a raw JSON object with these exact keys: 
    - vendorName (string)
    - title (string)
    - paymentTerms (string)
    - hasDataPrivacyClause (boolean)
    - hasIpTransferClause (boolean)`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: buffer.toString('base64'), mimeType: 'application/pdf' } }
    ]);

    const object = JSON.parse(result.response.text());

    let status = 'approved';
    if (object.paymentTerms.includes('90') || !object.hasDataPrivacyClause || !object.hasIpTransferClause) {
      status = 'flagged';
    }

    return NextResponse.json({ ...object, status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
