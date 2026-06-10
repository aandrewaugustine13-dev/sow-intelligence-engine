import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const prompt = `Extract the contract information from the attached PDF. 
    You must return ONLY a raw JSON object with these exact keys: 
    - vendorName (string)
    - title (string)
    - paymentTerms (string)
    - hasDataPrivacyClause (boolean)
    - hasIpTransferClause (boolean)`;

    const msg = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') } },
            { type: 'text', text: prompt }
          ]
        }
      ]
    });

    const textBlock = msg.content.find(block => block.type === 'text');
    const jsonString = textBlock && 'text' in textBlock ? textBlock.text : '{}';
    const object = JSON.parse(jsonString);

    let status = 'approved';
    if (object.paymentTerms.includes('90') || !object.hasDataPrivacyClause || !object.hasIpTransferClause) {
      status = 'flagged';
    }

    return NextResponse.json({ ...object, status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
