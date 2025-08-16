import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Demo Metrics Summary API
 * Returns static demo data for metrics when in demo mode
 * This endpoint works without any external dependencies
 */
export async function GET() {
  try {
    // Read demo data from static files
    const metricsPath = join(process.cwd(), 'app/dashboard/metrics-summary.json');
    
    let metricsData;
    try {
      const data = await readFile(metricsPath, 'utf8');
      metricsData = JSON.parse(data);
    } catch {
      // Fallback data if file reading fails
      metricsData = {
        totalPRs: 156,
        avgCycleTime: 2.3,
        throughput: 24,
        reviewTime: 8.2,
        categories: {
          'Feature Development': 45,
          'Bug Fixes': 28,
          'Refactoring': 18,
          'Documentation': 12,
          'Testing': 8
        }
      };
    }

    // Transform to match expected API format
    const transformedData = {
      pullRequests: {
        total: metricsData.totalPRs || 156,
        merged: Math.floor((metricsData.totalPRs || 156) * 0.85),
        open: Math.floor((metricsData.totalPRs || 156) * 0.12),
        closed: Math.floor((metricsData.totalPRs || 156) * 0.03)
      },
      metrics: {
        avgCycleTime: metricsData.avgCycleTime || 2.3,
        avgReviewTime: metricsData.reviewTime || 8.2,
        throughput: metricsData.throughput || 24,
        deploymentFrequency: 12.5
      },
      categories: metricsData.categories || {
        'Feature Development': 45,
        'Bug Fixes': 28,
        'Refactoring': 18,
        'Documentation': 12,
        'Testing': 8
      },
      trends: {
        cycleTime: { change: -0.3, direction: 'down' },
        throughput: { change: 2.1, direction: 'up' },
        reviewTime: { change: -0.8, direction: 'down' }
      },
      dataUpToDate: new Date().toISOString().split('T')[0],
      isDemoData: true
    };

    // Add cache headers for demo data
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    headers.set('Content-Type', 'application/json');
    headers.set('X-Demo-Mode', 'true');

    return NextResponse.json(transformedData, { headers });
    
  } catch (error) {
    console.error('Error loading demo metrics data:', error);
    
    // Minimal fallback
    const fallbackData = {
      pullRequests: { total: 100, merged: 85, open: 12, closed: 3 },
      metrics: { avgCycleTime: 2.5, avgReviewTime: 8.0, throughput: 20, deploymentFrequency: 10 },
      categories: { 'Feature Development': 40, 'Bug Fixes': 30, 'Other': 30 },
      trends: { cycleTime: { change: 0, direction: 'flat' } },
      dataUpToDate: new Date().toISOString().split('T')[0],
      isDemoData: true,
      message: 'This is demo data. Configure your environment to see real metrics.'
    };

    return NextResponse.json(fallbackData);
  }
}

// This endpoint is safe for demo mode and doesn't require authentication
export const dynamic = 'force-dynamic';
