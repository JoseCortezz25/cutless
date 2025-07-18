import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import z from 'zod';
import { systemPrompt } from '@/lib/prompts';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const fragments = formData.getAll('fragments');

  if (fragments.length === 0) {
    return NextResponse.json(
      { error: 'No fragments provided' },
      { status: 400 }
    );
  }

  const allFragments = fragments.map((fragment: FormDataEntryValue) => {
    return fragment.toString();
  });

  const response = await generateObject({
    model: google('gemini-2.0-flash'),
    system: systemPrompt,
    schema: z.object({
      email: z.string()
    }),
    prompt: `For these fragments, you must generate the HTML code for the email. The fragments are: ${allFragments.join(', ')}`
  });

  console.log(response.object);

  return NextResponse.json({ email: response });
}
