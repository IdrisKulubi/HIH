import { NextRequest, NextResponse } from 'next/server';
import { exportData } from '@/lib/actions/export';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Set maximum timeout to 60 seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request parameters
    if (!body.type || !['applications', 'applicants', 'eligibility'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid export type' },
        { status: 400 }
      );
    }
    
    if (!body.format || !['csv', 'json', 'xlsx'].includes(body.format)) {
      return NextResponse.json(
        { error: 'Invalid export format' },
        { status: 400 }
      );
    }
    
    // Process the export request
    const result = await exportData({
      type: body.type,
      format: body.format || 'csv',
      filters: body.filters || {},
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    
    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set('Content-Type', result.contentType || 'text/csv');
    headers.set('Content-Disposition', 
      `attachment; filename="${result.fileName}"`);
    
    // Handle base64 data conversion for binary files
    let responseData: string | Buffer = result.data || '';
    if (result.isBase64 && result.data) {
      responseData = Buffer.from(result.data, 'base64');
    }
    
    return new NextResponse(responseData, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
} 