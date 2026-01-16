// study-scheduler.js - Updated AI Study Scheduler Algorithm

// Helper function to parse date string
function parseDateFromString(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

class StudyScheduler {
    constructor() {
        this.difficultyMultiplier = {
            1: 0.7,  // Very Easy
            2: 0.85, // Easy
            3: 1.0,  // Medium
            4: 1.2,  // Hard
            5: 1.5   // Very Hard
        };
        
        this.weekdayWeight = 1.2;  // Prefer weekdays
        this.weekendWeight = 0.8;  // Avoid weekends when possible
    }

    /**
     * Generates an AI-powered study schedule for an assignment with balanced workload
     * @param {Object} assignment - Assignment details
     * @param {Date} today - Current date
     * @returns {Object} - Generated schedule with sessions and metadata
     */
    generateStudySchedule(assignment, today = new Date()) {
        const dueDate = parseDateFromString(assignment.dueDate);
        
        // Calculate days until due date
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntilDue < 0) {
            throw new Error('Due date cannot be in the past');
        }
        
        // Calculate total study hours needed
        let totalHours = this.calculateTotalStudyHours(assignment);
        
        // Determine optimal session parameters
        const sessionParams = this.determineSessionParameters(assignment, totalHours, daysUntilDue);
        
        // Generate balanced session distribution
        const sessionDistribution = this.generateBalancedDistribution(
            sessionParams.totalSessions, 
            daysUntilDue, 
            sessionParams.sessionLength,
            assignment.difficulty
        );
        
        // Create schedule items with balanced workload
        const schedule = this.createBalancedScheduleItems(
            sessionDistribution, 
            assignment, 
            today, 
            sessionParams.totalSessions
        );
        
        return {
            schedule: schedule,
            totalHours: totalHours,
            totalSessions: sessionParams.totalSessions,
            daysUntilDue: daysUntilDue,
            sessionLength: sessionParams.sessionLength,
            studyDays: new Set(sessionDistribution.map(s => s.daysFromNow)).size
        };
    }

    /**
     * Calculates total study hours needed for an assignment
     */
    calculateTotalStudyHours(assignment) {
        let totalHours = assignment.estimatedHours;
        
        // Adjust based on difficulty
        totalHours *= this.difficultyMultiplier[assignment.difficulty] || 1.0;
        
        // Adjust based on importance (15% is baseline)
        const importanceMultiplier = assignment.importance / 15;
        totalHours *= importanceMultiplier;
        
        // Adjust based on grade pressure
        if (assignment.currentGrade && assignment.targetGrade) {
            const gradeGap = assignment.targetGrade - assignment.currentGrade;
            if (gradeGap > 0) {
                totalHours *= (1 + (gradeGap / 100));
            }
        }
        
        // Ensure hours are within reasonable bounds (1-20 hours)
        return Math.max(1, Math.min(20, Math.round(totalHours)));
    }

    /**
     * Determines optimal session parameters
     */
    determineSessionParameters(assignment, totalHours, daysUntilDue) {
        // Base session length on difficulty and total hours
        let sessionLength;
        
        if (daysUntilDue <= 3) {
            // Cramming mode: shorter, more frequent sessions
            sessionLength = Math.min(2, Math.max(1, Math.ceil(assignment.difficulty / 3)));
        } else if (daysUntilDue <= 7) {
            // Short timeline: moderate sessions
            sessionLength = Math.min(3, Math.max(1, Math.ceil(assignment.difficulty / 2)));
        } else {
            // Long timeline: normal sessions
            sessionLength = Math.min(3, Math.max(1, Math.ceil(assignment.difficulty / 1.5)));
        }
        
        // Calculate total sessions
        const totalSessions = Math.ceil(totalHours / sessionLength);
        
        return { sessionLength, totalSessions };
    }

    /**
     * Generates balanced session distribution prioritizing weekdays
     */
    generateBalancedDistribution(totalSessions, daysUntilDue, sessionLength, difficulty) {
        const distribution = [];
        
        if (daysUntilDue <= 2) {
            // Very short timeline: multiple sessions per day
            return this.distributeForVeryShortTimeline(totalSessions, daysUntilDue, sessionLength);
        } else if (daysUntilDue <= 7) {
            // Short timeline: balanced daily distribution
            return this.distributeForShortTimeline(totalSessions, daysUntilDue, sessionLength, difficulty);
        } else {
            // Long timeline: prioritize weekdays, avoid overloading weekends
            return this.distributeForLongTimeline(totalSessions, daysUntilDue, sessionLength);
        }
    }

    /**
     * Distribution for very short timelines (1-2 days)
     */
    distributeForVeryShortTimeline(totalSessions, daysUntilDue, sessionLength) {
        const distribution = [];
        const sessionsPerDay = Math.ceil(totalSessions / daysUntilDue);
        
        for (let day = 1; day <= daysUntilDue; day++) {
            for (let session = 0; session < sessionsPerDay; session++) {
                if (distribution.length < totalSessions) {
                    // Shorter sessions for cramming
                    const adjustedLength = Math.min(1.5, sessionLength);
                    distribution.push({
                        daysFromNow: day,
                        length: adjustedLength,
                        priority: 'high',
                        isWeekend: this.isWeekendDay(day)
                    });
                }
            }
        }
        
        return distribution;
    }

    /**
     * Distribution for short timelines (3-7 days)
     */
    distributeForShortTimeline(totalSessions, daysUntilDue, sessionLength, difficulty) {
        const distribution = [];
        const availableDays = this.getAvailableDays(daysUntilDue);
        
        // Sort days by preference (weekdays first)
        availableDays.sort((a, b) => {
            if (a.isWeekend && !b.isWeekend) return 1;
            if (!a.isWeekend && b.isWeekend) return -1;
            return a.day - b.day;
        });
        
        // Distribute sessions evenly with priority to weekdays
        for (let i = 0; i < totalSessions; i++) {
            const dayIndex = i % availableDays.length;
            const day = availableDays[dayIndex];
            
            // Adjust session length based on day type
            let adjustedLength = sessionLength;
            if (day.isWeekend && difficulty >= 4) {
                // Shorter sessions on weekends for difficult subjects
                adjustedLength = Math.max(1, sessionLength - 0.5);
            }
            
            distribution.push({
                daysFromNow: day.day,
                length: adjustedLength,
                priority: this.determinePriority(day.day, daysUntilDue, day.isWeekend),
                isWeekend: day.isWeekend
            });
        }
        
        // Sort by day
        distribution.sort((a, b) => a.daysFromNow - b.daysFromNow);
        
        return distribution;
    }

    /**
     * Distribution for long timelines (8+ days)
     */
    distributeForLongTimeline(totalSessions, daysUntilDue, sessionLength) {
        const distribution = [];
        const availableDays = this.getAvailableDays(daysUntilDue);
        
        // Calculate sessions per week (2-3 sessions per week for long timelines)
        const weeks = Math.ceil(daysUntilDue / 7);
        const sessionsPerWeek = Math.min(3, Math.max(2, Math.ceil(totalSessions / weeks)));
        
        // Distribute sessions across weeks
        let sessionCount = 0;
        for (let week = 0; week < weeks; week++) {
            // Get weekdays for this week
            const weekDays = availableDays.filter(d => 
                d.day > week * 7 && d.day <= (week + 1) * 7 && !d.isWeekend
            );
            
            // Get weekends for this week
            const weekendDays = availableDays.filter(d => 
                d.day > week * 7 && d.day <= (week + 1) * 7 && d.isWeekend
            );
            
            // Distribute sessions in this week (prioritize weekdays)
            const sessionsThisWeek = Math.min(
                sessionsPerWeek, 
                totalSessions - sessionCount
            );
            
            // Use weekdays first, then weekends if needed
            let daysToUse = [...weekDays];
            if (sessionsThisWeek > weekDays.length) {
                daysToUse = [...weekDays, ...weekendDays.slice(0, sessionsThisWeek - weekDays.length)];
            }
            
            // Sort by day
            daysToUse.sort((a, b) => a.day - b.day);
            
            // Distribute sessions evenly across selected days
            for (let i = 0; i < Math.min(sessionsThisWeek, daysToUse.length); i++) {
                const day = daysToUse[i];
                
                // Adjust session length based on day type
                let adjustedLength = sessionLength;
                if (day.isWeekend) {
                    // Slightly shorter sessions on weekends
                    adjustedLength = Math.max(1, sessionLength - 0.5);
                }
                
                distribution.push({
                    daysFromNow: day.day,
                    length: adjustedLength,
                    priority: this.determinePriority(day.day, daysUntilDue, day.isWeekend),
                    isWeekend: day.isWeekend
                });
                sessionCount++;
                
                if (sessionCount >= totalSessions) break;
            }
            
            if (sessionCount >= totalSessions) break;
        }
        
        // Sort by day
        distribution.sort((a, b) => a.daysFromNow - b.daysFromNow);
        
        return distribution;
    }

    /**
     * Creates balanced schedule items with varied focus areas
     */
    createBalancedScheduleItems(sessionDistribution, assignment, today, totalSessions) {
        const schedule = [];
        
        sessionDistribution.forEach((session, index) => {
            const sessionDate = new Date(today);
            sessionDate.setDate(today.getDate() + session.daysFromNow);
            const dateString = this.formatDate(sessionDate);
            
            // Determine session focus based on progress (balanced distribution)
            const focus = this.determineSessionFocus(index, totalSessions, assignment.difficulty);
            
            // Determine optimal time of day
            const optimalTime = this.determineOptimalTime(session.priority, session.isWeekend, assignment.difficulty);
            
            schedule.push({
                date: sessionDate,
                dateString: dateString,
                title: `${assignment.course}: ${focus}`,
                description: `Study session ${index + 1}/${totalSessions} for "${assignment.title}"`,
                length: session.length,
                priority: session.priority,
                focus: focus,
                optimalTime: optimalTime,
                isWeekend: session.isWeekend,
                assignmentId: assignment.id,
                assignmentTitle: assignment.title
            });
        });
        
        return schedule;
    }

    /**
     * Gets available days with weekday/weekend information
     */
    getAvailableDays(daysUntilDue) {
        const availableDays = [];
        
        for (let day = 1; day <= daysUntilDue; day++) {
            // Create a date for this day
            const date = new Date();
            date.setDate(date.getDate() + day);
            
            // Check if it's a weekend (0 = Sunday, 6 = Saturday)
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            availableDays.push({
                day: day,
                isWeekend: isWeekend,
                dayOfWeek: dayOfWeek,
                weight: isWeekend ? this.weekendWeight : this.weekdayWeight
            });
        }
        
        return availableDays;
    }

    /**
     * Checks if a specific day from now is a weekend
     */
    isWeekendDay(daysFromNow) {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
    }

    /**
     * Determines session priority
     */
    determinePriority(daysFromNow, daysUntilDue, isWeekend) {
        // High priority for sessions close to due date or on weekdays
        if (daysFromNow <= 2) return 'high';
        if (daysFromNow >= daysUntilDue - 1) return 'high';
        if (!isWeekend && daysFromNow <= daysUntilDue / 2) return 'medium';
        return 'normal';
    }

    /**
     * Determines session focus based on progress
     */
    determineSessionFocus(sessionIndex, totalSessions, difficulty) {
        const focusAreas = [
            'Introduction & Overview',
            'Core Concepts & Theory',
            'Practice Problems',
            'Application & Analysis',
            'Review & Synthesis',
            'Final Preparation'
        ];
        
        // Distribute focus areas based on difficulty and session count
        let focusIndex;
        
        if (totalSessions <= 3) {
            // Few sessions: cover basics
            if (sessionIndex === 0) return 'Introduction & Planning';
            if (sessionIndex === totalSessions - 1) return 'Final Review';
            return 'Core Concepts';
        } else if (totalSessions <= 6) {
            // Moderate sessions: balanced progression
            const progression = sessionIndex / (totalSessions - 1);
            if (progression < 0.3) return 'Introduction & Basics';
            if (progression < 0.6) return 'Core Concepts';
            return 'Practice & Review';
        } else {
            // Many sessions: detailed progression
            const segments = difficulty >= 4 ? 6 : 4;
            const segmentSize = totalSessions / segments;
            const currentSegment = Math.floor(sessionIndex / segmentSize);
            
            return focusAreas[Math.min(currentSegment, focusAreas.length - 1)];
        }
    }

    /**
     * Determines optimal time of day for study session
     */
    determineOptimalTime(priority, isWeekend, difficulty) {
        if (priority === 'high') {
            return isWeekend ? 'Morning (9 AM - 12 PM)' : 'Morning (8 AM - 11 AM)';
        }
        
        if (difficulty >= 4) {
            return isWeekend ? 'Afternoon (1 PM - 4 PM)' : 'Morning (10 AM - 1 PM)';
        }
        
        return isWeekend ? 'Afternoon (2 PM - 5 PM)' : 'Evening (6 PM - 9 PM)';
    }

    /**
     * Formats date as YYYY-MM-DD
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Helper function to determine importance level from percentage
     */
    static getImportanceLevel(percentage) {
        if (percentage >= 30) return 'high';
        if (percentage >= 15) return 'medium';
        return 'low';
    }

    /**
     * Helper function to determine difficulty level text
     */
    static getDifficultyLevel(level) {
        const levels = ['very easy', 'easy', 'medium', 'hard', 'very hard'];
        return levels[level - 1] || 'medium';
    }

    /**
     * Calculates recommended break duration between sessions
     */
    calculateBreakDuration(sessionLength) {
        if (sessionLength <= 1) return 10;
        if (sessionLength <= 2) return 15;
        return 20;
    }

    /**
     * Generates study tips based on assignment details
     */
    generateStudyTips(assignment) {
        const tips = [];
        
        // Add difficulty-based tips
        if (assignment.difficulty >= 4) {
            tips.push('Break complex topics into smaller, manageable chunks');
            tips.push('Start with foundational concepts before moving to advanced topics');
            tips.push('Use spaced repetition for better retention of difficult material');
        }
        
        // Add importance-based tips
        if (assignment.importance >= 30) {
            tips.push('High-weight assignment: allocate dedicated review sessions');
            tips.push('Create summary sheets for key concepts and formulas');
            tips.push('Practice with past exams or similar problems if available');
        }
        
        // Add scheduling tips
        tips.push('Study during your peak concentration hours');
        tips.push('Take regular breaks using the Pomodoro technique (25 min work, 5 min break)');
        tips.push('Review material within 24 hours to improve long-term memory');
        tips.push('Teach the concepts to someone else to reinforce understanding');
        
        // Add balance tips
        tips.push('Balance study sessions with other commitments to avoid burnout');
        tips.push('Weekday sessions are prioritized for better consistency');
        tips.push('Use weekends for lighter review and consolidation');
        
        return tips;
    }

    /**
     * Calculates workload intensity for each day
     */
    calculateDailyWorkload(schedule) {
        const dailyWorkload = {};
        
        schedule.forEach(session => {
            const dateString = session.dateString;
            if (!dailyWorkload[dateString]) {
                dailyWorkload[dateString] = {
                    totalHours: 0,
                    sessions: [],
                    isWeekend: session.isWeekend
                };
            }
            
            dailyWorkload[dateString].totalHours += session.length;
            dailyWorkload[dateString].sessions.push(session);
        });
        
        return dailyWorkload;
    }

    /**
     * Suggests adjustments for better work-life balance
     */
    suggestBalanceAdjustments(schedule, maxDailyHours = 3) {
        const adjustments = [];
        const dailyWorkload = this.calculateDailyWorkload(schedule);
        
        for (const [dateString, workload] of Object.entries(dailyWorkload)) {
            if (workload.totalHours > maxDailyHours) {
                adjustments.push({
                    date: dateString,
                    currentHours: workload.totalHours,
                    recommendedMax: maxDailyHours,
                    suggestion: `Consider spreading ${(workload.totalHours - maxDailyHours).toFixed(1)} hours to adjacent days`
                });
            }
            
            if (workload.isWeekend && workload.totalHours > maxDailyHours * 0.7) {
                adjustments.push({
                    date: dateString,
                    currentHours: workload.totalHours,
                    note: 'Weekend session - consider lighter workload for better balance'
                });
            }
        }
        
        return adjustments;
    }
}