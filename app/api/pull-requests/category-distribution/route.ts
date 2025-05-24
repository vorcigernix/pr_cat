import { NextRequest, NextResponse } from 'next/server';
import * as PRRepository from '@/lib/repositories/pr-repository';
import * as OrganizationRepository from '@/lib/repositories/organization-repository';
import { auth } from '@/auth';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Extract time range from search params
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '30d'; // Default to 30 days
    const format = searchParams.get('format') || 'total'; // 'total' or 'timeseries'
    
    // Calculate time range dates
    let timeRangeFilter;
    let days = 30;
    if (timeRange !== 'all') {
      const now = new Date();
      const daysMap: Record<string, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90
      };
      
      days = daysMap[timeRange] || 30;
      const fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - days);
      
      timeRangeFilter = {
        from: fromDate.toISOString(),
        to: now.toISOString()
      };
    }

    // Get the user's active organization
    const organizations = await OrganizationRepository.getUserOrganizationsWithRole(session.user.id);
    if (!organizations || organizations.length === 0) {
      return NextResponse.json({ error: 'No organizations found' }, { status: 404 });
    }

    // For simplicity, use the first organization
    const orgId = organizations[0].id;

    if (format === 'timeseries') {
      // Return time series data for trending
      console.log(`Fetching category time series for ${days} days`);
      const start = Date.now();
      const categoryTimeSeriesData = await getCategoryDistributionTimeSeries(orgId, days);
      const duration = Date.now() - start;
      console.log(`Category time series query completed in ${duration}ms`);
      return NextResponse.json(categoryTimeSeriesData);
    } else {
      // Return total counts (original behavior)
      const categoryDistribution = await PRRepository.getPullRequestCountByCategory(orgId, timeRangeFilter);
      
      // Ensure we don't have null category names in the response
      const formattedDistribution = categoryDistribution.map(item => ({
        ...item,
        category_name: item.category_name || 'Uncategorized'
      }));

      return NextResponse.json(formattedDistribution);
    }
  } catch (error) {
    console.error('Error fetching category distribution:', error);
    return NextResponse.json({ error: 'Failed to fetch category distribution' }, { status: 500 });
  }
}

async function getCategoryDistributionTimeSeries(organizationId: number, days: number) {
  // Use a single optimized query to get all data at once
  const sql = `
    SELECT 
      DATE(pr.created_at) as date,
      COALESCE(c.name, 'Uncategorized') as category_name,
      COUNT(*) as count
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    LEFT JOIN categories c ON pr.category_id = c.id
    WHERE r.organization_id = ?
    AND pr.created_at >= datetime('now', '-${days} days')
    GROUP BY DATE(pr.created_at), c.id, c.name
    ORDER BY date ASC, category_name
  `;

  const results = await query<{ date: string; category_name: string; count: number }>(sql, [organizationId]);

  // Get unique categories from results
  const categorySet = new Set<string>();
  results.forEach(row => categorySet.add(row.category_name));
  const categories = Array.from(categorySet).sort();

  // Generate complete date range
  const timeSeriesData: Array<{ date: string; [key: string]: string | number }> = [];
  const endDate = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayData: { date: string; [key: string]: string | number } = {
      date: dateStr
    };

    // Initialize all categories to 0
    categories.forEach(category => {
      dayData[category.replace(/\s+/g, '_')] = 0;
    });

    timeSeriesData.push(dayData);
  }

  // Fill in actual data from query results
  results.forEach(row => {
    const dayData = timeSeriesData.find(item => item.date === row.date);
    if (dayData) {
      const categoryKey = row.category_name.replace(/\s+/g, '_');
      dayData[categoryKey] = row.count;
    }
  });

  return {
    data: timeSeriesData,
    categories: categories.map((category, index) => ({
      key: category.replace(/\s+/g, '_'),
      label: category,
      color: getColorForCategory(category, index)
    }))
  };
}

function getColorForCategory(categoryName: string, index: number): string {
  // Use hardcoded colors instead of CSS variables for better compatibility
  const colors = [
    "#3b82f6", // Blue
    "#ef4444", // Red  
    "#f97316", // Orange
    "#a855f7", // Purple
    "#14b8a6", // Teal
    "#eab308", // Yellow
    "#ec4899", // Pink
    "#6366f1", // Indigo
    "#84cc16", // Lime
    "#f59e0b"  // Amber
  ];
  
  return colors[index % colors.length];
} 