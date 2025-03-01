document.addEventListener('DOMContentLoaded', function() {
    // Set up dimensions and margins - increased height to make room for better legend area
    const margin = { top: 120, right: 50, bottom: 200, left: 100 };
    const width = 1100 - margin.left - margin.right;
    const height = 800 - margin.top - margin.bottom;
    const yearHeight = height / 3;
    const monthWidth = width / 12;

    // Create SVG
    const svg = d3.select("#covid-visualization")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("style", "background-color: black;")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Load data from the CSV file
    d3.csv("COVID_US_cases.csv").then(csvData => {
        const data = processCSVData(csvData);
        createVisualization(data);
    }).catch(error => {
        console.error("Error loading CSV file:", error);
    });

    // Function to process the CSV data into the format we need
    function processCSVData(csvData) {
        return csvData.map(d => {
            // Parse the date (assuming date format is YYYY-MM-DD or MM/DD/YYYY)
            const dateParts = d.date.includes('-') 
                ? d.date.split('-') 
                : d.date.split('/');
            
            // Create proper date object based on the format
            let date;
            if (d.date.includes('-')) {
        
                date = new Date(
                    parseInt(dateParts[0]),  // Year
                    parseInt(dateParts[1]) - 1,  // Month (0-indexed)
                    parseInt(dateParts[2])   // Day
                );
            } else {
                // MM/DD/YYYY format
                date = new Date(
                    parseInt(dateParts[2]),  // Year
                    parseInt(dateParts[0]) - 1,  // Month (0-indexed)
                    parseInt(dateParts[1])   // Day
                );
            }
            
            return {
                date: date,
                // Parse the cases value as a number
                new_confirmed: parseInt(d.new_confirmed || d.cases || 0),
                year: date.getFullYear(),
                month: date.getMonth(),
                day: date.getDate(),
                // Calculate the week number within the month (0-based)
                weekNum: Math.floor((date.getDate() - 1) / 7),
                // Create a unique ID for each week
                weekId: `${date.getFullYear()}-${date.getMonth()}-${Math.floor((date.getDate() - 1) / 7)}`,
                // The actual date is the middle of the week for real data
                middleDay: date.getDate()
            };
        });
    }

    // Generate placeholder death data (about 1-2% of case data)
    function generatePlaceholderDeathData(caseData) {
        return caseData.map(d => ({
            ...d,
            new_confirmed: Math.round(d.new_confirmed * 0.015) // Approximately 1.5% death rate
        }));
    }

    // Function to create the visualization
    function createVisualization(caseData) {
        // Generate placeholder death data
        const deathData = generatePlaceholderDeathData(caseData);
        
        // Group data by week
        const weeklyCase = d3.groups(caseData, d => d.weekId)
            .map(([weekId, values]) => ({
                weekId: weekId,
                new_confirmed_avg: d3.mean(values, d => d.new_confirmed),
                date: values[0].date,
                year: values[0].year,
                month: values[0].month,
                day: values[0].day,
                middleDay: values[0].middleDay
            }));
            
        const weeklyDeath = d3.groups(deathData, d => d.weekId)
            .map(([weekId, values]) => ({
                weekId: weekId,
                new_confirmed_avg: d3.mean(values, d => d.new_confirmed),
                date: values[0].date,
                year: values[0].year,
                month: values[0].month,
                day: values[0].day,
                middleDay: values[0].middleDay
            }));
        
        // Group weekly data by year and month
        const nestedCaseData = d3.groups(
            weeklyCase, 
            d => d.year, 
            d => d.month
        );
        
        const nestedDeathData = d3.groups(
            weeklyDeath, 
            d => d.year, 
            d => d.month
        );
        
        // Find max average for scaling
        const maxCaseAverage = d3.max(weeklyCase, d => d.new_confirmed_avg);
        const maxDeathAverage = d3.max(weeklyDeath, d => d.new_confirmed_avg);
        
        // For proper scaling, check what the actual maximum is in the data
        console.log("Max case value in data:", maxCaseAverage);

        // First find the overall maximum to use for both scales
        const overallMaximum = Math.max(maxCaseAverage, maxDeathAverage * 20); // Scale up deaths to match cases
        
        const scaleDomainMax = overallMaximum;
        
        // Use the same scale for both, with range increased by 1.5x
        const radiusScaleCase = d3.scaleSqrt()
            .domain([0, scaleDomainMax])
            .range([5, 60]); // Increased from 30 to 45 (1.5x larger)
            
        const radiusScaleDeath = d3.scaleSqrt()
            .domain([0, scaleDomainMax])
            .range([5, 60]); // Same scale as cases
            
        // Color scale - made deceased darker
        const colorScaleCase = d3.scaleLinear()
            .domain([0, maxCaseAverage])
            .range(["rgba(186, 85, 211, 0.05)", "rgba(186, 85, 211, 0.95)"]);
            
        const colorScaleDeath = d3.scaleLinear()
            .domain([0, maxDeathAverage])
            .range(["rgba(0, 0, 0, 0.05)", "rgba(0, 0, 0, 0.95)"]); // Much darker
        
        // Add year labels - moved further left to prevent being covered by circles
        svg.selectAll(".year-label")
            .data(['2020', '2021', '2022'])
            .enter()
            .append("text")
            .attr("class", "year-label")
            .attr("x", -40) // Moved further left to prevent overlap with circles
            .attr("y", (d, i) => i * yearHeight + yearHeight / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .attr("fill", "white")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text(d => d);
        
        // Add month labels
        svg.selectAll(".month-label")
            .data(d3.range(12))
            .enter()
            .append("text")
            .attr("class", "month-label")
            .attr("x", d => d * monthWidth + monthWidth / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", "12px")
            .text(d => {
                const date = new Date(2020, d, 1);
                return date.toLocaleString('default', { month: 'short' });
            });
        
        // Add grid - vertical lines (months) and add weekly dividers
        svg.selectAll(".vgrid-month")
            .data(d3.range(13))
            .enter()
            .append("line")
            .attr("class", "vgrid-month")
            .attr("x1", d => d * monthWidth)
            .attr("y1", 0)
            .attr("x2", d => d * monthWidth)
            .attr("y2", height)
            .attr("stroke", "rgba(255, 255, 255, 0.3)") // Brighter for month lines
            .attr("stroke-width", 1);
            
        // Add finer weekly grid lines for each month
        const weeksPerMonth = 4;
        svg.selectAll(".vgrid-week")
            .data(d3.range(12 * weeksPerMonth)) // 12 months x 4 weeks
            .enter()
            .append("line")
            .attr("class", "vgrid-week")
            .attr("x1", d => Math.floor(d / weeksPerMonth) * monthWidth + (d % weeksPerMonth + 1) * (monthWidth / (weeksPerMonth + 1)))
            .attr("y1", 0)
            .attr("x2", d => Math.floor(d / weeksPerMonth) * monthWidth + (d % weeksPerMonth + 1) * (monthWidth / (weeksPerMonth + 1)))
            .attr("y2", height)
            .attr("stroke", "rgba(255, 255, 255, 0.1)") // Lighter for week lines
            .attr("stroke-width", 0.5)
            .attr("stroke-dasharray", "2,2"); // Dashed line for weeks
        
        // Add grid - horizontal lines (years)
        svg.selectAll(".hgrid")
            .data(d3.range(4))
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("y1", d => d * yearHeight)
            .attr("x2", width)
            .attr("y2", d => d * yearHeight)
            .attr("stroke", "rgba(255, 255, 255, 0.2)")
            .attr("stroke-width", 0.5);
        
        // Create year groups for cases - now drawing continuous bands for entire year
        const yearGroups = svg.selectAll(".year-group")
            .data(nestedCaseData)
            .enter()
            .append("g")
            .attr("class", "year-group")
            .attr("transform", d => `translate(0,${(d[0] - 2020) * yearHeight})`);
            
        // Draw continuous bands for each year of data - CASES
        yearGroups.each(function(yearData) {
            const year = yearData[0];
            
            // Flatten all the week data for this year
            const allWeeksData = [];
            yearData[1].forEach(monthData => {
                const month = monthData[0];
                const weeksData = monthData[1];
                
                weeksData.forEach(week => {
                    // Add absolute x position based on month and day
                    const daysInMonth = 30; // simplification
                    week.xPos = month * monthWidth + (week.middleDay / daysInMonth) * monthWidth;
                    allWeeksData.push(week);
                });
            });
            
            // Sort data points by date for proper path drawing
            allWeeksData.sort((a, b) => a.date - b.date);
            
            if (allWeeksData.length < 2) return; // Skip if not enough data points
            
            // Calculate points for the continuous shape
            const pathPoints = [];
            const bottomPathPoints = [];
            
            allWeeksData.forEach(d => {
                const radius = radiusScaleCase(d.new_confirmed_avg);
                const y = yearHeight / 2;
                
                // Add top and bottom curve points
                pathPoints.push([d.xPos, y - radius]);
                bottomPathPoints.push([d.xPos, y + radius]);
            });
            
            // Create the full path
            const fullPath = pathPoints.concat(bottomPathPoints.reverse());
            
            // Generate SVG path with basis curve for smooth connection
            const pathGenerator = d3.line()
                .x(d => d[0])
                .y(d => d[1])
                .curve(d3.curveBasis); // This creates a smooth tangent curve
            
            // Add the path behind the circles (band) - continuous for the whole year
            d3.select(this)
                .append("path")
                .attr("d", pathGenerator(fullPath) + "Z") // Close path
                .attr("fill", "rgba(186, 85, 211, 0.5)") 
                .attr("stroke", "rgba(186, 85, 211, 0.7)") 
                .attr("stroke-width", 0.5);
                
            // Add circles for each week - NO STROKE
            d3.select(this)
                .selectAll("circle")
                .data(allWeeksData)
                .enter()
                .append("circle")
                .attr("cx", d => d.xPos)
                .attr("cy", yearHeight / 2)
                .attr("r", d => radiusScaleCase(d.new_confirmed_avg))
                .attr("fill", d => colorScaleCase(d.new_confirmed_avg))
                .attr("stroke", "none");
        });
        
        // Create year groups for deaths - grey band (darker now)
        const yearGroupsDeath = svg.selectAll(".year-group-death")
            .data(nestedDeathData)
            .enter()
            .append("g")
            .attr("class", "year-group-death")
            .attr("transform", d => `translate(0,${(d[0] - 2020) * yearHeight})`);
        
        // Draw continuous bands for each year of data - DEATHS
        yearGroupsDeath.each(function(yearData) {
            const year = yearData[0];
            
            // Flatten all the week data for this year
            const allWeeksData = [];
            yearData[1].forEach(monthData => {
                const month = monthData[0];
                const weeksData = monthData[1];
                
                weeksData.forEach(week => {
                    // Add absolute x position based on month and day
                    const daysInMonth = 30; // simplification
                    week.xPos = month * monthWidth + (week.middleDay / daysInMonth) * monthWidth;
                    allWeeksData.push(week);
                });
            });
            
            // Sort data points by date for proper path drawing
            allWeeksData.sort((a, b) => a.date - b.date);
            
            if (allWeeksData.length < 2) return; // Skip if not enough data points
            
            // Calculate points for the continuous shape
            const pathPoints = [];
            const bottomPathPoints = [];
            
            allWeeksData.forEach(d => {
                const radius = radiusScaleDeath(d.new_confirmed_avg);
                const y = yearHeight / 2;
                
                // Add top and bottom curve points
                pathPoints.push([d.xPos, y - radius]);
                bottomPathPoints.push([d.xPos, y + radius]);
            });
            
            // Create the full path
            const fullPath = pathPoints.concat(bottomPathPoints.reverse());
            
            // Generate SVG path with basis curve for smooth connection
            const pathGenerator = d3.line()
                .x(d => d[0])
                .y(d => d[1])
                .curve(d3.curveBasis); // This creates a smooth tangent curve
            
            // Add the path behind the circles (band) - continuous for the whole year and darker
            d3.select(this)
                .append("path")
                .attr("d", pathGenerator(fullPath) + "Z") // Close path
                .attr("fill", "rgba(80, 80, 80, 0.6)") // Darker grey
                .attr("stroke", "rgba(60, 60, 60, 0.8)") // Darker stroke
                .attr("stroke-width", 0.5);
                
            // Add circles for each week - NO STROKE
            d3.select(this)
                .selectAll("circle.death")
                .data(allWeeksData)
                .enter()
                .append("circle")
                .attr("class", "death")
                .attr("cx", d => d.xPos)
                .attr("cy", yearHeight / 2)
                .attr("r", d => radiusScaleDeath(d.new_confirmed_avg))
                .attr("fill", "rgba(60, 60, 60, 0.8)") // Darker fill for deceased circles
                .attr("stroke", "none");
        });
        
        // Add title with significantly more space
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -80) 
            .attr("text-anchor", "middle")
            .attr("font-size", "22px")
            .attr("font-weight", "bold")
            .attr("fill", "white")
            .text("COVID-19 US Cases (2020-2022)");
            
        const legendArea = svg.append("g")
            .attr("class", "legend-area")
            .attr("transform", `translate(0, ${height + 60})`);
    
        
        // Calculate widths based on 1:3 ratio
        const leftSectionWidth = width / 4;  // 1/4 of the total width
        const rightSectionWidth = width * 3/4;  // 3/4 of the total width
            
        // Split the legend area into left and right sections with 1:3 ratio
        const leftLegend = legendArea.append("g")
            .attr("class", "left-legend")
            .attr("transform", `translate(50, 0)`);
            
        const rightLegend = legendArea.append("g")
            .attr("class", "right-legend")
            .attr("transform", `translate(${leftSectionWidth + 50}, 0)`);
            
        
        
        // ======= LEFT SIDE LEGEND (COLOR LEGEND) =======
        // Color legend title
        leftLegend.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("text-anchor", "start")
            .attr("fill", "white")
            .attr("font-size", "12px")
            .attr("font-weight", "bold");
        

        leftLegend.append("circle")
            .attr("r", 8)
            .attr("cx", 10)
            .attr("cy", 30)
            .attr("fill", "rgba(186, 85, 211, 0.95)");
            
        leftLegend.append("text")
            .attr("x", 25)
            .attr("y", 34)
            .text("New Confirmed Cases")
            .attr("fill", "white")
            .attr("font-size", "12px");
        
    
        leftLegend.append("circle")
            .attr("r", 8)
            .attr("cx", 10)
            .attr("cy", 60)
            .attr("fill", "rgba(60, 60, 60, 0.8)");
            
        leftLegend.append("text")
            .attr("x", 25)
            .attr("y", 64)
            .text("New Deceased Cases")
            .attr("fill", "white")
            .attr("font-size", "12px");
        
        // ======= RIGHT SIDE LEGEND (SIZE LEGEND) =======
        rightLegend.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("text-anchor", "start")
            .attr("fill", "white")
            .attr("font-size", "12px")
            .text("7-Day Average Values");
        
        // Create size legend with fixed values
        const sizeLegendData = [
            { label: "10,000", value: 10000 },
            { label: "100,000", value: 100000 },
            { label: "200,000", value: 200000 },
            { label: "500,000", value: 500000 },
            { label: "800,000", value: 1000000 }
        ];
        
        // Calculate spacing for size legend circles
        const availableWidth = rightSectionWidth/1.1 - 100;
        const sizeLegendSpacing = availableWidth / (sizeLegendData.length - 1);
        
        // Draw size legend circles
        sizeLegendData.forEach((d, i) => {
            const xPos = i * sizeLegendSpacing;
            
            // Add circle
            rightLegend.append("circle")
                .attr("cx", xPos)
                .attr("cy", 45) // Center vertically between the two rows of the color legend
                .attr("r", radiusScaleCase(d.value))
                .attr("fill", "none")
                .attr("stroke", "rgba(255, 255, 255, 0.8)")
                .attr("stroke-width", 1);
                
            // Add label
            rightLegend.append("text")
                .attr("x", xPos)
                .attr("y", 120) // Position below the largest circle
                .attr("text-anchor", "middle")
                .attr("fill", "white")
                .attr("font-size", "12px")
                .text(d.label);
        });
    }
});