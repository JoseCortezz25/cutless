"use server";

import { generateObject } from 'ai';
import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY
});

export const generateEmail = async (formData: FormData) => {
  const fragments = formData.getAll('fragments');

  if (fragments.length === 0) {
    return { error: 'No fragments provided' };
  }

  for (const fragment of fragments) {
    console.log("fragment", fragment.toString().slice(0, 100));
    console.log("fragment", fragment.toString().slice(0, 100));
    console.log("fragment", fragment.toString().slice(0, 100));
  }
  
  // const { object } = await generateObject({
  //   model: google('gemini-1.5-pro-latest', {
  //     structuredOutputs: false
  //   }),
  //   mode: 'json',
  //   schema: z.object({
  //     email: z.string(),
  //     subject: z.string(),
  //     body: z.string()
  //   }),
  //   prompt: `Genera un email para el siguiente contenido: ${fragments.join('\n')}`
  // }); 

  // return object;
};
