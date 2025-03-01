// Wrap everything in a try-catch to catch any errors
try {
    console.log("D3.js script starting execution");
    
    // Check if D3 is available
    if (typeof d3 === 'undefined') {
      console.error("D3.js library is not loaded! Please check your script tags.");
      document.getElementById('covid-visualization').innerHTML = 
        '<div style="color: red; padding: 20px;">Error: D3.js library not found. Check console for details.</div>';
      throw new Error("D3.js library not found");
    }
    
    console.log("D3.js version:", d3.version);
    
    // Set up dimensions and margins
    const margin = { top: 50, right: 50, bottom: 30, left: 60 };
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    const yearHeight = height / 3;
    const monthWidth = width / 12;
    
    console.log("Visualization container:", document.getElementById('covid-visualization'));
    
    // Check if the container exists
    if (!document.getElementById('covid-visualization')) {
      console.error("Container element #covid-visualization not found!");
      throw new Error("Container element not found");
    }
    
    // Add a visible element to confirm the container is working
    document.getElementById('covid-visualization').innerHTML = 
      '<div style="color: white; padding: 10px; background-color: #333;">Initializing visualization...</div>';
    
    // Create SVG with explicit dimensions for debugging
    const svg = d3.select("#covid-visualization")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("style", "background-color: black;")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    console.log("SVG created");
    
    // Add a visible rectangle to confirm the SVG is rendering
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 2);
    
    console.log("Debug rectangle added");
    
    // Add text to confirm visualization is working
    svg.append("text")
      .attr("x", width/2)
      .attr("y", height/2)
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .attr("font-size", "20px")
      .text("Visualization area - loading data...");
    
    console.log("Debug text added");
    
    // Color scale for circles - pink/purple with varying saturation
    const colorScale = d3.scaleLinear()
      .range(["rgba(186, 85, 211, 0.3)", "rgba(186, 85, 211, 0.95)"]);
    
    // Generate sample data since we don't have the actual CSV file
    console.log("Generating sample data");
    const sampleData = generateSampleData();
    console.log("Sample data generated, first few items:", sampleData.slice(0, 3));
    processData(sampleData);
  
    function generateSampleData() {
      const data = [];
      const startDate = new Date(2020, 0, 1);
      const endDate = new Date(2022, 11, 31);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = d.getMonth();
        const day = d.getDate();
        
        // Create some realistic COVID patterns
        // First wave in spring 2020, winter 2020 wave, 2021 waves, Omicron early 2022
        let baseCases;
        const dayOfYear = Math.floor((d - new Date(year, 0, 0)) / (24 * 60 * 60 * 1000));
        
        if (year === 2020) {
          // Spring and winter waves
          baseCases = 50000 * (0.5 + Math.sin((dayOfYear - 80) / 40)) * (1 + 0.8 * Math.sin(dayOfYear / 150));
        } else if (year === 2021) {
          // Winter, spring lull, delta wave, winter again
          baseCases = 100000 * (0.7 + Math.sin((dayOfYear + 60) / 50)) * (0.8 + 0.6 * Math.sin(dayOfYear / 120));
        } else {
          // 2022: Omicron wave, then declining
          baseCases = 200000 * Math.exp(-dayOfYear / 100) * (1.5 + Math.sin(dayOfYear / 40));
        }
        
        // Add some randomness
        const newCases = Math.max(0, Math.round(baseCases * (0.7 + Math.random() * 0.6)));
        
        data.push({
          date: new Date(d),  // Ensure we're creating a proper date object
          new_confirmed: newCases,
          new_deceased: Math.round(newCases * 0.015),
          new_recovered: Math.round(newCases * 0.8),
          new_tested: Math.round(newCases * 5),
          cumulative_confirmed: 0,
          cumulative_deceased: 0,
          cumulative_recovered: 0,
          cumulative_tested: 0
        });
      }
      
      return data;
    }
  
    function processData(data) {
      console.log("Processing data");
      // Process the data
      data.forEach(d => {
        // Handle both string dates from CSV and Date objects from sample data
        d.date = (typeof d.date === 'string') ? new Date(d.date) : d.date;
        d.new_confirmed = +d.new_confirmed;
        
        // Extract year, month, day
        d.year = d.date.getFullYear();
        d.month = d.date.getMonth(); // 0-based (January is 0)
        d.day = d.date.getDate();
        
        // Create a week identifier (year-week)
        const firstDayOfYear = new Date(d.year, 0, 1);
        const dayOfYear = Math.floor((d.date - firstDayOfYear) / (24 * 60 * 60 * 1000));
        d.weekNum = Math.floor(dayOfYear / 7);
        d.weekId = `${d.year}-${d.weekNum}`;
      });
      
      // Filter data for 2020-2022
      const filteredData = data.filter(d => d.year >= 2020 && d.year <= 2022);
      console.log("Filtered data length:", filteredData.length);
      
      // Group data by week instead of showing individual days
      const weeklyData = d3.rollups(
        filteredData,
        v => ({
          new_confirmed_avg: d3.mean(v, d => d.new_confirmed),
          date: d3.median(v, d => d.date), // use the middle day of week as center point
          year: v[0].year,
          month: v[0].month,
          weekNum: v[0].weekNum
        }),
        d => d.weekId
      ).map(d => d[1]);
      
      console.log("Weekly data created, count:", weeklyData.length);
      console.log("Sample of weekly data:", weeklyData.slice(0, 3));
      
      // Group weekly data by year and month
      const nestedData = d3.groups(
        weeklyData, 
        d => d.year, 
        d => d.month
      );
      
      console.log("Data nested by year and month");
      
      // Find max average for scaling circles
      const maxAverage = d3.max(weeklyData, d => d.new_confirmed_avg);
      console.log("Max average:", maxAverage);
      
      // Scale for circle radius (min 3px, max 30px for better visibility)
      const radiusScale = d3.scaleSqrt()
        .domain([0, maxAverage])
        .range([3, 30]);
      
      // Update color scale domain
      colorScale.domain([0, maxAverage]);
      
      // Clear the debug elements
      svg.selectAll("*").remove();
      
      // Fix the year labels - use full 4-digit year labels
      const yearLabels = ['2020', '2021', '2022']; 
      
      svg.selectAll(".year-label")
        .data(yearLabels)
        .enter()
        .append("text")
        .attr("class", "year-label")
        .attr("x", -30)
        .attr("y", (d, i) => i * yearHeight + yearHeight / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("fill", "white")  // Explicitly set fill color
        .attr("font-size", "16px")  // Explicitly set font size
        .text(d => d);
      
      console.log("Year labels added");
      
      // Add month labels with better formatting
      svg.selectAll(".month-label")
        .data(d3.range(12))
        .enter()
        .append("text")
        .attr("class", "month-label")
        .attr("x", d => d * monthWidth + monthWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("fill", "white")  // Explicitly set fill color
        .attr("font-size", "12px")  // Explicitly set font size
        .text(d => {
          const date = new Date(2020, d, 1);
          return date.toLocaleString('default', { month: 'short' });
        });
      
      console.log("Month labels added");
      
      // Add grid
      // Vertical grid lines (months)
      svg.selectAll(".vgrid")
        .data(d3.range(13))
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", d => d * monthWidth)
        .attr("y1", 0)
        .attr("x2", d => d * monthWidth)
        .attr("y2", height)
        .attr("stroke", "rgba(255, 255, 255, 0.2)")
        .attr("stroke-width", 0.5);
      
      // Horizontal grid lines (years)
      svg.selectAll(".hgrid")
        .data(d3.range(4))
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", 0)
        .attr("y1", d => d * yearHeight)
        .attr("x2", width)
        .attr("y2", d => d * yearHeight)
        .attr("stroke", "rgba(255, 255, 255, 0.2)")
        .attr("stroke-width", 0.5);
      
      console.log("Grid lines added");
      
      // Create a group for each year
      const yearGroups = svg.selectAll(".year-group")
        .data(nestedData)
        .enter()
        .append("g")
        .attr("class", "year-group")
        .attr("transform", d => `translate(0,${(d[0] - 2020) * yearHeight})`);
      
      console.log("Year groups created");
      
      // For each year, create month groups
      const monthGroups = yearGroups.selectAll(".month-group")
        .data(d => d[1])
        .enter()
        .append("g")
        .attr("class", "month-group")
        .attr("transform", d => `translate(${d[0] * monthWidth},0)`);
      
      console.log("Month groups created");
      
      // Generate curve paths for each month
      monthGroups.each(function(monthData) {
        const month = monthData[0];
        const weeksData = monthData[1];
        
        // Sort by date
        weeksData.sort((a, b) => a.date - b.date);
        
        if (weeksData.length < 2) return; // Skip if not enough data points
        
        // Calculate points for the shape
        const pathPoints = [];
        const bottomPathPoints = [];
        
        weeksData.forEach(d => {
          const radius = radiusScale(d.new_confirmed_avg);
          
          // Calculate position based on day of month
          // Position circle at the time point of the center day of the week
          const dayOfMonth = d.date.getDate() - 1; // 0-based day
          const daysInMonth = new Date(d.year, d.month + 1, 0).getDate();
          const x = dayOfMonth * (monthWidth / daysInMonth);
          
          // Center in the year section
          const y = yearHeight / 2;
          
          // Add top curve points
          pathPoints.push([x, y - radius]);
          
          // Add bottom curve points (will be reversed later)
          bottomPathPoints.push([x, y + radius]);
        });
        
        // Create the full path by combining top path, reversed bottom path
        const fullPath = pathPoints.concat(bottomPathPoints.reverse());
        
        // Generate SVG path string
        const pathGenerator = d3.line()
          .x(d => d[0])
          .y(d => d[1])
          .curve(d3.curveBasis);
        
        // Add the path with pink/purple color
        d3.select(this)
          .append("path")
          .attr("d", pathGenerator(fullPath) + "Z") // Close path
          .attr("fill", "rgba(186, 85, 211, 0.2)")
          .attr("stroke", "rgba(186, 85, 211, 0.6)")
          .attr("stroke-width", 1);
        
        // Add circles for each week
        d3.select(this)
          .selectAll("circle")
          .data(weeksData)
          .enter()
          .append("circle")
          .attr("cx", d => {
            const dayOfMonth = d.date.getDate() - 1; // 0-based day
            const daysInMonth = new Date(d.year, d.month + 1, 0).getDate();
            return dayOfMonth * (monthWidth / daysInMonth);
          })
          .attr("cy", yearHeight / 2)
          .attr("r", d => radiusScale(d.new_confirmed_avg))
          .attr("fill", d => colorScale(d.new_confirmed_avg))
          .attr("stroke", "rgba(220, 180, 242, 0.8)")
          .attr("stroke-width", 1);
      });
      
      console.log("Month data paths and circles created");
      
      // Add a title with white text
      svg.append("text")
        .attr("class", "title-text")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "white")  // Explicitly set fill color
        .text("COVID-19 US Cases (2020-2022): Weekly Averages");
      
      // Add a legend explaining color/size with white text
      const legendG = svg.append("g")
        .attr("transform", `translate(${width - 150}, 20)`);
      
      legendG.append("text")
        .attr("class", "legend-text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("font-size", "12px")
        .attr("fill", "white")  // Explicitly set fill color
        .text("Circle size & color:");
      
      legendG.append("text")
        .attr("class", "legend-text")
        .attr("x", 0)
        .attr("y", 20)
        .attr("font-size", "12px")
        .attr("fill", "white")  // Explicitly set fill color
        .text("Weekly average case count");
      
      console.log("Visualization completed successfully");
    }
  } catch (error) {
    console.error("Error in D3.js visualization:", error);
    // Display error message to user
    if (document.getElementById('covid-visualization')) {
      document.getElementById('covid-visualization').innerHTML = 
        `<div style="color: red; padding: 20px; background-color: #333;">
          <h3>Visualization Error</h3>
          <p>${error.message}</p>
          <p>Please check the browser console for more details.</p>
        </div>`;
    }
  }