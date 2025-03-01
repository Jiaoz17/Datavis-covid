// Main function executed when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Load the CSV data
  d3.csv("COVID_US_cases.csv").then(function(data) {
    createCovidVisualization(data);
  }).catch(function(error) {
    console.error("Error loading CSV:", error);
  });
});

function createCovidVisualization(data) {
  // Get the window height
  const windowHeight = window.innerHeight;
  
  // Fixed width with full height
  const fixedWidth = 960;
  const margin = { 
    top: windowHeight * 0.05, 
    right: 80, 
    bottom: windowHeight * 0.05, 
    left: 80 
  };
  
  const width = fixedWidth - margin.left - margin.right;
  const height = windowHeight - margin.top - margin.bottom;

  // Parse date format
  const parseDate = d3.timeParse("%Y-%m-%d");
  
  // Process the data
  data.forEach(d => {
    d.date = parseDate(d.date);
    d.new_confirmed = +d.new_confirmed;
    d.new_deceased = +d.new_deceased;
    d.cumulative_confirmed = +d.cumulative_confirmed;
    d.cumulative_deceased = +d.cumulative_deceased;
  });

  // Group by month for bands
  const monthlyData = d3.rollup(data, 
    values => {
      // Get the last day of the month for cumulative values
      const lastDay = values[values.length - 1];
      return {
        date: lastDay.date,
        month: d3.timeFormat("%b %Y")(lastDay.date),
        // Sum of new cases for the month
        monthly_new_confirmed: d3.sum(values, d => d.new_confirmed),
        monthly_new_deceased: d3.sum(values, d => d.new_deceased),
        // Cumulative totals at the end of the month
        cumulative_confirmed: lastDay.cumulative_confirmed,
        cumulative_deceased: lastDay.cumulative_deceased
      };
    },
    d => d3.timeFormat("%Y-%m")(d.date)
  );
  
  // Convert the Map to an array
  const monthlyArray = Array.from(monthlyData.values())
    .sort((a, b) => a.date - b.date);

  // Create SVG
  const svg = d3.select("#visualization")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add black background
  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "black");

  // Find max values for y scale
  const maxConfirmed = d3.max(data, d => d.cumulative_confirmed);
  const maxDeceased = d3.max(data, d => d.cumulative_deceased);
  
  // Allocate space proportionally based on the ratio of max values
  const confirmedRatio = 0.85; // Give confirmed cases 85% of the space
  const deceasedRatio = 0.15; // Give deceased cases 15% of the space
  
  const centerlineY = height * confirmedRatio;
  
  // Create scales
  const xScale = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([0, width]);
    
  // Separate scales for confirmed and deceased with appropriate proportions
  const yScaleConfirmed = d3.scaleLinear()
    .domain([0, maxConfirmed])
    .range([centerlineY, 0])
    .nice();
    
  const yScaleDeceased = d3.scaleLinear()
    .domain([0, maxDeceased])
    .range([0, height - centerlineY])
    .nice();

  // Create horizontal axis (centerline)
  svg.append("line")
    .attr("x1", 0)
    .attr("y1", centerlineY)
    .attr("x2", width)
    .attr("y2", centerlineY)
    .attr("stroke", "white")
    .attr("stroke-width", 1);

  // Create vertical axis
  svg.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", height)
    .attr("stroke", "white")
    .attr("stroke-width", 1);

  // Add vertical axis ticks and labels for confirmed cases
  const confirmedTicks = yScaleConfirmed.ticks(5);
  svg.selectAll(".tick-confirmed")
    .data(confirmedTicks)
    .enter()
    .append("line")
    .attr("class", "tick-confirmed")
    .attr("x1", -5)
    .attr("y1", d => yScaleConfirmed(d))
    .attr("x2", 0)
    .attr("y2", d => yScaleConfirmed(d))
    .attr("stroke", "#e879f9")
    .attr("stroke-width", 1);

  svg.selectAll(".tick-label-confirmed")
    .data(confirmedTicks)
    .enter()
    .append("text")
    .attr("class", "tick-label-confirmed")
    .attr("x", -10)
    .attr("y", d => yScaleConfirmed(d))
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle")
    .attr("fill", "#e879f9")
    .attr("font-size", "12px")
    .text(d => d3.format(",.0f")(d));
    
  // Add vertical axis ticks and labels for deceased cases
  const deceasedTicks = yScaleDeceased.ticks(3);
  svg.selectAll(".tick-deceased")
    .data(deceasedTicks)
    .enter()
    .append("line")
    .attr("class", "tick-deceased")
    .attr("x1", -5)
    .attr("y1", d => centerlineY + yScaleDeceased(d))
    .attr("x2", 0)
    .attr("y2", d => centerlineY + yScaleDeceased(d))
    .attr("stroke", "#93c5fd")
    .attr("stroke-width", 1);

  svg.selectAll(".tick-label-deceased")
    .data(deceasedTicks)
    .enter()
    .append("text")
    .attr("class", "tick-label-deceased")
    .attr("x", -10)
    .attr("y", d => centerlineY + yScaleDeceased(d))
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle")
    .attr("fill", "#93c5fd")
    .attr("font-size", "12px")
    .text(d => d3.format(",.0f")(d));

  // Add month reference lines
  const monthDates = d3.timeMonth.range(
    d3.timeMonth.floor(data[0].date),
    d3.timeMonth.ceil(data[data.length - 1].date)
  );

  svg.selectAll(".month-line")
    .data(monthDates)
    .enter()
    .append("line")
    .attr("class", "month-line")
    .attr("x1", d => xScale(d))
    .attr("y1", 0)
    .attr("x2", d => xScale(d))
    .attr("y2", height)
    .attr("stroke", "rgba(255, 255, 255, 0.1)")
    .attr("stroke-dasharray", "2 3");

  // Create line generators for confirmed cases
  const confirmedLine = d3.line()
    .x(d => xScale(d.date))
    .y(d => yScaleConfirmed(d.cumulative_confirmed));

  // Create line generators for deceased cases
  const deceasedLine = d3.line()
    .x(d => xScale(d.date))
    .y(d => centerlineY + yScaleDeceased(d.cumulative_deceased));

  // Color scales for the bands
  const colorScaleConfirmed = d3.scaleLinear()
    .domain([0, d3.max(monthlyArray, d => d.monthly_new_confirmed)])
    .range(["#d8b4fe", "#c026d3"]); // Light pink to vibrant purple

  const colorScaleDeceased = d3.scaleLinear()  
    .domain([0, d3.max(monthlyArray, d => d.monthly_new_deceased)])
    .range(["#bfdbfe", "#2563eb"]); // Light blue to vibrant blue

  // Draw the confirmed areas between the main line and monthly offset lines
  monthlyArray.forEach((monthData, i) => {
    // Find the point for this month on the curve
    const curveX = xScale(monthData.date);
    const curveY = yScaleConfirmed(monthData.cumulative_confirmed);
    
    // Calculate the position of the offset point (directly below the curve point)
    const offsetY = yScaleConfirmed(monthData.cumulative_confirmed - monthData.monthly_new_confirmed);
    
    // Create a polygon connecting this month's curve point with the previous month's curve point
    if (i > 0) {
      const prevMonth = monthlyArray[i-1];
      const prevX = xScale(prevMonth.date);
      const prevY = yScaleConfirmed(prevMonth.cumulative_confirmed);
      const prevOffsetY = yScaleConfirmed(prevMonth.cumulative_confirmed - prevMonth.monthly_new_confirmed);
      
      // Draw the polygon that fills the area
      svg.append("polygon")
        .attr("points", `
          ${prevX},${prevY} 
          ${curveX},${curveY} 
          ${curveX},${offsetY} 
          ${prevX},${prevOffsetY}
        `)
        .attr("fill", colorScaleConfirmed(monthData.monthly_new_confirmed))
        .attr("fill-opacity", 0.8)
        .attr("stroke", "none")
        .append("title")
        .text(`${monthData.month}: ${d3.format(",.0f")(monthData.monthly_new_confirmed)} new cases`);
      
      // Draw the vertical lines at month boundaries
      svg.append("line")
        .attr("x1", prevX)
        .attr("y1", prevY)
        .attr("x2", prevX)
        .attr("y2", prevOffsetY)
        .attr("stroke", "#e879f9")
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", 0.7);
    }
    
    // Draw the vertical line for the last month
    if (i === monthlyArray.length - 1) {
      svg.append("line")
        .attr("x1", curveX)
        .attr("y1", curveY)
        .attr("x2", curveX)
        .attr("y2", offsetY)
        .attr("stroke", "#e879f9")
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", 0.7);
    }
  });
  
  // Draw the deceased areas between the main line and monthly offset lines
  monthlyArray.forEach((monthData, i) => {
    // Find the point for this month on the curve
    const curveX = xScale(monthData.date);
    const curveY = centerlineY + yScaleDeceased(monthData.cumulative_deceased);
    
    // Calculate the position of the offset point (directly above the curve point)
    const offsetY = centerlineY + yScaleDeceased(monthData.cumulative_deceased + monthData.monthly_new_deceased);
    
    // Create a polygon connecting this month's curve point with the previous month's curve point
    if (i > 0) {
      const prevMonth = monthlyArray[i-1];
      const prevX = xScale(prevMonth.date);
      const prevY = centerlineY + yScaleDeceased(prevMonth.cumulative_deceased);
      const prevOffsetY = centerlineY + yScaleDeceased(prevMonth.cumulative_deceased + prevMonth.monthly_new_deceased);
      
      // Draw the polygon that fills the area
      svg.append("polygon")
        .attr("points", `
          ${prevX},${prevY} 
          ${curveX},${curveY} 
          ${curveX},${offsetY} 
          ${prevX},${prevOffsetY}
        `)
        .attr("fill", colorScaleDeceased(monthData.monthly_new_deceased))
        .attr("fill-opacity", 0.8)
        .attr("stroke", "none")
        .append("title")
        .text(`${monthData.month}: ${d3.format(",.0f")(monthData.monthly_new_deceased)} deaths`);
      
      // Draw the vertical lines at month boundaries
      svg.append("line")
        .attr("x1", prevX)
        .attr("y1", prevY)
        .attr("x2", prevX)
        .attr("y2", prevOffsetY)
        .attr("stroke", "#93c5fd")
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", 0.7);
    }
    
    // Draw the vertical line for the last month
    if (i === monthlyArray.length - 1) {
      svg.append("line")
        .attr("x1", curveX)
        .attr("y1", curveY)
        .attr("x2", curveX)
        .attr("y2", offsetY)
        .attr("stroke", "#93c5fd")
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", 0.7);
    }
  });

  // Add the confirmed line on top of the bands
  svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#e879f9") // Pink/purple for confirmed
    .attr("stroke-width", 2)
    .attr("d", confirmedLine);

  // Add the deceased line on top of the bands
  svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#93c5fd") // Blue/gray for deceased
    .attr("stroke-width", 2)
    .attr("d", deceasedLine);

  // Add year marks on x-axis
  const years = d3.timeYear.range(
    d3.timeYear.floor(data[0].date),
    d3.timeYear.offset(d3.timeYear.ceil(data[data.length - 1].date), 1)
  );

  svg.selectAll(".year-line")
    .data(years)
    .enter()
    .append("line")
    .attr("class", "year-line")
    .attr("x1", d => xScale(d))
    .attr("y1", height)
    .attr("x2", d => xScale(d))
    .attr("y2", height + 10)
    .attr("stroke", "white")
    .attr("stroke-width", 1);

  svg.selectAll(".year-label")
    .data(years)
    .enter()
    .append("text")
    .attr("class", "year-label")
    .attr("x", d => xScale(d))
    .attr("y", height + 30)
    .attr("text-anchor", "middle")
    .attr("font-family", "Arial")
    .attr("font-size", "12px")
    .attr("fill", "white")
    .text(d => d3.timeFormat("%Y")(d));

  // Add axis labels
  svg.append("text")
    .attr("x", width)
    .attr("y", height + 60)
    .attr("text-anchor", "end")
    .attr("font-family", "Arial")
    .attr("font-size", "14px")
    .attr("fill", "white")
    .text("Time");

  svg.append("text")
    .attr("x", 10)
    .attr("y", 20)
    .attr("text-anchor", "start")
    .attr("font-family", "Arial")
    .attr("font-size", "14px")
    .attr("fill", "#e879f9")
    .text("Confirmed Cases");

  svg.append("text")
    .attr("x", 10)
    .attr("y", height - 10)
    .attr("text-anchor", "start")
    .attr("font-family", "Arial")
    .attr("font-size", "14px")
    .attr("fill", "#93c5fd")
    .text("Deceased Cases");
    
  // Add a legend for band heights
  const legendSizes = [1000000, 5000000, 10000000];
  const legendX = width - 220;
  const legendY = 50;
  
  svg.append("text")
    .attr("x", legendX)
    .attr("y", legendY - 20)
    .attr("text-anchor", "start")
    .attr("font-family", "Arial")
    .attr("font-size", "14px")
    .attr("fill", "white")
    .text("Monthly New Cases");
  
  legendSizes.forEach((value, i) => {
    const bandY = legendY + i * 70;
    const bandHeight = yScaleConfirmed(0) - yScaleConfirmed(value);
    const rectWidth = 80;
    
    // Draw main legend line (representing the cumulative curve)
    svg.append("line")
      .attr("x1", legendX)
      .attr("y1", bandY)
      .attr("x2", legendX + rectWidth)
      .attr("y2", bandY)
      .attr("stroke", "#e879f9")
      .attr("stroke-width", 2);
      
    // Draw the offset line (representing the monthly offset)
    svg.append("line")
      .attr("x1", legendX)
      .attr("y1", bandY + bandHeight)
      .attr("x2", legendX + rectWidth)
      .attr("y2", bandY + bandHeight)
      .attr("stroke", "#e879f9")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.7);
      
    // Draw vertical connector lines
    svg.append("line")
      .attr("x1", legendX)
      .attr("y1", bandY)
      .attr("x2", legendX)
      .attr("y2", bandY + bandHeight)
      .attr("stroke", "#e879f9")
      .attr("stroke-width", 0.5);
      
    svg.append("line")
      .attr("x1", legendX + rectWidth)
      .attr("y1", bandY)
      .attr("x2", legendX + rectWidth)
      .attr("y2", bandY + bandHeight)
      .attr("stroke", "#e879f9")
      .attr("stroke-width", 0.5);
      
    // Fill the area
    svg.append("rect")
      .attr("x", legendX)
      .attr("y", bandY)
      .attr("width", rectWidth)
      .attr("height", bandHeight)
      .attr("fill", colorScaleConfirmed(value))
      .attr("fill-opacity", 0.8);
      
    // Label
    svg.append("text")
      .attr("x", legendX + rectWidth + 20)
      .attr("y", bandY + bandHeight/2)
      .attr("dominant-baseline", "middle")
      .attr("font-family", "Arial")
      .attr("font-size", "12px")
      .attr("fill", "white")
      .text(d3.format(",.0f")(value));
  });
  
  // Add window resize listener for vertical adjustments only
  window.addEventListener('resize', function() {
    // Clear the visualization
    d3.select("#visualization").html("");
    // Recreate with new height
    createCovidVisualization(data);
  });
}