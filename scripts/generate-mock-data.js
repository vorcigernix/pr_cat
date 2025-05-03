/**
 * Mock Data Generator for Engineering Metrics Dashboard
 * 
 * This script generates realistic mock data for the DORA metrics dashboard
 * including PR data, developer activities, and derived metrics.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const NUM_DEVELOPERS = 10;
const NUM_REPOS = 5;
const NUM_PRS = 100;
const NUM_DAYS = 90;
const OUTPUT_DIR = path.join(__dirname, '..', 'app', 'dashboard');

// Helper Functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 1) {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateDateInRange(startDate, endDate) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const randomTime = randomInt(start, end);
  return new Date(randomTime);
}

// Generate Developers
function generateDevelopers() {
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery', 'Cameron', 'Quinn', 'Sam', 'Blake'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Martinez', 'Lee', 'Nguyen', 'Kim'];
  
  return Array(NUM_DEVELOPERS).fill().map((_, id) => {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    return {
      id: id + 1,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      avatar: `https://i.pravatar.cc/150?u=${firstName}_${lastName}`,
      role: randomItem(['Frontend', 'Backend', 'Full Stack', 'DevOps', 'QA']),
      experience: randomItem(['Junior', 'Mid-level', 'Senior', 'Lead']),
      averageCodingTime: randomFloat(3, 6),
    };
  });
}

// Generate Repositories
function generateRepositories() {
  const repoNames = ['api-service', 'web-client', 'mobile-app', 'data-processor', 'auth-service', 'notification-service', 'analytics-dashboard', 'infrastructure'];
  
  return Array(NUM_REPOS).fill().map((_, id) => {
    const name = repoNames[id % repoNames.length];
    return {
      id: id + 1,
      name,
      fullName: `company/${name}`,
      language: randomItem(['JavaScript', 'TypeScript', 'Python', 'Go', 'Java']),
      isPrivate: Math.random() > 0.3,
      stars: randomInt(0, 1000),
      createdAt: generateDateInRange('2022-01-01', '2023-01-01').toISOString(),
    };
  });
}

// Generate Pull Requests
function generatePullRequests(developers, repositories) {
  const prTitles = [
    'Add user authentication',
    'Fix responsive layout issues',
    'Implement API pagination',
    'Update dependencies',
    'Refactor data fetching logic',
    'Add unit tests for user service',
    'Fix memory leak in background process',
    'Implement dark mode',
    'Add error handling',
    'Optimize database queries',
    'Add caching layer',
    'Update documentation',
    'Fix security vulnerability',
    'Add new feature',
    'Performance improvements',
  ];

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - NUM_DAYS);

  return Array(NUM_PRS).fill().map((_, id) => {
    const createdAt = generateDateInRange(startDate, endDate);
    const reviewStartedAt = new Date(createdAt);
    reviewStartedAt.setHours(reviewStartedAt.getHours() + randomInt(1, 48));
    
    const mergedAt = new Date(reviewStartedAt);
    mergedAt.setHours(mergedAt.getHours() + randomInt(1, 72));
    
    const deployedAt = new Date(mergedAt);
    deployedAt.setHours(deployedAt.getHours() + randomInt(1, 24));

    const developer = randomItem(developers);
    const reviewers = developers
      .filter(d => d.id !== developer.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, randomInt(1, 3));
    
    const repository = randomItem(repositories);
    const linesAdded = randomInt(5, 500);
    const linesRemoved = randomInt(0, linesAdded);
    
    const commentCount = randomInt(0, 20);
    const reviewThoroughness = commentCount / ((linesAdded + linesRemoved) / 100);
    
    return {
      id: id + 1,
      title: randomItem(prTitles),
      number: randomInt(100, 9999),
      developer: {
        id: developer.id,
        name: developer.name,
      },
      repository: {
        id: repository.id,
        name: repository.name,
      },
      status: randomItem(['merged', 'open', 'closed', 'merged', 'merged']), // Bias toward merged
      createdAt: createdAt.toISOString(),
      reviewStartedAt: reviewStartedAt.toISOString(),
      mergedAt: mergedAt.toISOString(),
      deployedAt: deployedAt.toISOString(),
      reviewers: reviewers.map(r => ({ id: r.id, name: r.name })),
      linesAdded,
      linesRemoved,
      files: randomInt(1, 15),
      commentCount,
      approvalCount: randomInt(0, reviewers.length),
      reviewThoroughness: parseFloat(reviewThoroughness.toFixed(2)),
      
      // Derived metrics
      timeToFirstReview: parseFloat(((reviewStartedAt - createdAt) / (1000 * 60 * 60)).toFixed(1)), // hours
      reviewTime: parseFloat(((mergedAt - reviewStartedAt) / (1000 * 60 * 60)).toFixed(1)), // hours
      cycleTime: parseFloat(((deployedAt - createdAt) / (1000 * 60 * 60)).toFixed(1)), // hours
      
      // Quality score (weighted calculation)
      qualityScore: Math.min(100, Math.round(
        (50 - Math.min(50, Math.log2(linesAdded + linesRemoved))) + // Size (smaller is better)
        (Math.min(25, commentCount * 2)) + // Review thoroughness
        (randomInt(0, 25)) // Random component (test coverage, etc.)
      )),
    };
  });
}

// Generate Time Series Data
function generateTimeSeriesData(pullRequests, developers) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - NUM_DAYS);
  startDate.setHours(0, 0, 0, 0);
  
  const dates = [];
  const currentDate = new Date(startDate);
  const endDate = new Date();
  
  // Generate array of dates
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate).toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Map each date to metrics
  return dates.map(date => {
    // Filter PRs created on this date
    const dateStart = new Date(date);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    const dayPRs = pullRequests.filter(pr => {
      const createdDate = new Date(pr.createdAt);
      return createdDate >= dateStart && createdDate <= dateEnd;
    });
    
    // Calculate day's metrics
    const prThroughput = dayPRs.length;
    const avgCycleTime = dayPRs.length ? 
      parseFloat((dayPRs.reduce((sum, pr) => sum + pr.cycleTime, 0) / dayPRs.length).toFixed(1)) : 
      null;
    const avgReviewTime = dayPRs.length ? 
      parseFloat((dayPRs.reduce((sum, pr) => sum + pr.reviewTime, 0) / dayPRs.length).toFixed(1)) : 
      null;
    const avgCodingHours = parseFloat(randomFloat(3.5, 5.5, 1).toFixed(1));
    
    return {
      date,
      prThroughput,
      cycleTime: avgCycleTime || randomFloat(20, 40), // Fallback to random if no PRs
      reviewTime: avgReviewTime || randomFloat(4, 12), // Fallback to random if no PRs
      codingHours: avgCodingHours,
    };
  });
}

// Generate Metrics Summary
function generateMetricsSummary(pullRequests, timeSeriesData) {
  const mergedPRs = pullRequests.filter(pr => pr.status === 'merged');
  
  // Calculate current period vs previous period
  const halfwayIndex = Math.floor(timeSeriesData.length / 2);
  const currentPeriod = timeSeriesData.slice(halfwayIndex);
  const previousPeriod = timeSeriesData.slice(0, halfwayIndex);
  
  // Calculate metrics
  const avgCodingTime = parseFloat((currentPeriod.reduce((sum, day) => sum + day.codingHours, 0) / currentPeriod.length).toFixed(1));
  const prevAvgCodingTime = parseFloat((previousPeriod.reduce((sum, day) => sum + day.codingHours, 0) / previousPeriod.length).toFixed(1));
  
  const avgPRSize = parseFloat((mergedPRs.reduce((sum, pr) => sum + pr.linesAdded + pr.linesRemoved, 0) / mergedPRs.length).toFixed(0));
  const recentPRs = mergedPRs.slice(-Math.floor(mergedPRs.length/2));
  const olderPRs = mergedPRs.slice(0, Math.floor(mergedPRs.length/2));
  const prevAvgPRSize = parseFloat((olderPRs.reduce((sum, pr) => sum + pr.linesAdded + pr.linesRemoved, 0) / olderPRs.length).toFixed(0));
  
  const avgCycleTime = parseFloat((mergedPRs.reduce((sum, pr) => sum + pr.cycleTime, 0) / mergedPRs.length).toFixed(1));
  const prevAvgCycleTime = parseFloat((olderPRs.reduce((sum, pr) => sum + pr.cycleTime, 0) / olderPRs.length).toFixed(1));
  
  const avgReviewTime = parseFloat((mergedPRs.reduce((sum, pr) => sum + pr.reviewTime, 0) / mergedPRs.length).toFixed(1));
  const prevAvgReviewTime = parseFloat((olderPRs.reduce((sum, pr) => sum + pr.reviewTime, 0) / olderPRs.length).toFixed(1));
  
  return {
    codingTime: {
      value: avgCodingTime,
      change: parseFloat((avgCodingTime - prevAvgCodingTime).toFixed(1)),
      trend: avgCodingTime >= prevAvgCodingTime ? 'up' : 'down',
    },
    prSize: {
      value: avgPRSize,
      change: parseFloat((avgPRSize - prevAvgPRSize).toFixed(0)),
      trend: avgPRSize <= prevAvgPRSize ? 'up' : 'down', // smaller is better
    },
    cycleTime: {
      value: avgCycleTime,
      change: parseFloat((avgCycleTime - prevAvgCycleTime).toFixed(1)),
      trend: avgCycleTime <= prevAvgCycleTime ? 'up' : 'down', // shorter is better
    },
    reviewTime: {
      value: avgReviewTime,
      change: parseFloat((avgReviewTime - prevAvgReviewTime).toFixed(1)),
      trend: avgReviewTime <= prevAvgReviewTime ? 'up' : 'down', // shorter is better
    },
  };
}

// Main function to generate all data
function generateAllData() {
  console.log('Generating mock data...');
  
  // Generate base entities
  const developers = generateDevelopers();
  const repositories = generateRepositories();
  const pullRequests = generatePullRequests(developers, repositories);
  
  // Generate derived data
  const timeSeriesData = generateTimeSeriesData(pullRequests, developers);
  const metricsSummary = generateMetricsSummary(pullRequests, timeSeriesData);
  
  // Package all data
  const allData = {
    developers,
    repositories,
    pullRequests,
    timeSeriesData,
    metricsSummary,
  };
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Write to files
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'developers.json'),
    JSON.stringify(developers, null, 2)
  );
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'repositories.json'),
    JSON.stringify(repositories, null, 2)
  );
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'pull-requests.json'),
    JSON.stringify(pullRequests, null, 2)
  );
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'time-series.json'),
    JSON.stringify(timeSeriesData, null, 2)
  );
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'metrics-summary.json'),
    JSON.stringify(metricsSummary, null, 2)
  );
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'all-data.json'),
    JSON.stringify(allData, null, 2)
  );
  
  console.log('Mock data generated successfully! Files saved to:', OUTPUT_DIR);
}

// Run the generator
generateAllData(); 