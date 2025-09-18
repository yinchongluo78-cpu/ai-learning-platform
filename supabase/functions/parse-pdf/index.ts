// Supabase Edge Function for PDF parsing
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as pdfParse from "https://deno.land/x/pdf_extract@v0.1.5/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the PDF file from request
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      throw new Error('No file provided')
    }

    // Check file type
    if (!file.type.includes('pdf')) {
      throw new Error('File must be a PDF')
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size is 100MB`)
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Parse PDF
    const pdfData = await pdfParse.extractText(uint8Array)

    // Extract text from all pages
    let fullText = ''
    let pageCount = 0

    for (const page of pdfData.pages) {
      pageCount++
      fullText += `\n--- Page ${pageCount} ---\n`
      fullText += page.text
    }

    // Clean up text
    fullText = fullText.replace(/\s+/g, ' ').trim()

    // Return parsed data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          text: fullText,
          pageCount: pageCount,
          metadata: {
            title: file.name,
            size: file.size,
            type: file.type
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})