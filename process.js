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
    // Set dimensions and margins
    const margin = { top: 50, right: 80, bottom: 80, left: 80 };
    const width = 960 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
  
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
  
    // Group by month for circles
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
    
    // Allocate space proportionally based on the ratio of max values (80% for confirmed, 20% for deceased)
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
      .attr("font-size", "10px")
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
      .attr("font-size", "10px")
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
  
    // Add the confirmed line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#e879f9") // Pink/purple for confirmed
      .attr("stroke-width", 2)
      .attr("d", confirmedLine);
  
    // Add the deceased line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#93c5fd") // Blue/gray for deceased
      .attr("stroke-width", 2)
      .attr("d", deceasedLine);
  
    // Get the scale factors for the y-axis to make circle diameter consistent with the axis scale
    const confirmedScaleFactor = (yScaleConfirmed(0) - yScaleConfirmed(10000000)) / 10000000;
    
    // Scale for circle radius - Make sure the diameter accurately represents the value on the same scale as the axis
    const rScale = d3.scaleSqrt()
      .domain([0, 10000000])  // Maximum represented value
      .range([0, 10000000 * confirmedScaleFactor / 2]);  // Convert to radius (half of diameter)
      
    // Clamp the radius to a maximum value to avoid overly large circles
    function getClampedRadius(value) {
      return Math.min(rScale(value), 50);  // Maximum radius of 50px
      
    // Color scales for the circles
    const colorScaleConfirmed = d3.scaleLinear()
      .domain([0, d3.max(monthlyArray, d => d.monthly_new_confirmed)])
      .range(["#d8b4fe", "#a855f7"]); // Light pink to saturated purple
  
    const colorScaleDeceased = d3.scaleLinear()  
      .domain([0, d3.max(monthlyArray, d => d.monthly_new_deceased)])
      .range(["#bfdbfe", "#3b82f6"]); // Light blue to saturated blue
  
    // Calculate circle positions for confirmed cases
    function getConfirmedCirclePos(d) {
      const x = xScale(d.date);
      const y = yScaleConfirmed(d.cumulative_confirmed);
      const r = rScale(d.monthly_new_confirmed);
      
      // Make sure circles stay within the plotting area
      // Position the circle so that it's tangent to the line but doesn't go above 0
      const adjustedY = Math.min(y + r, centerlineY - r);
      
      return {
        cx: x,
        cy: adjustedY
      };
    }
  
    // Calculate circle positions for deceased cases
    function getDeceasedCirclePos(d) {
      const x = xScale(d.date);
      const y = centerlineY + yScaleDeceased(d.cumulative_deceased);
      const r = rScale(d.monthly_new_deceased);
      
      // Make sure circles stay within the plotting area
      // Position the circle so that it's tangent to the line but doesn't go below the bottom
      const adjustedY = Math.max(y - r, centerlineY + r);
      
      return {
        cx: x,
        cy: adjustedY
      };
    }
  
    // Add circles for monthly confirmed cases
    svg.selectAll(".confirmed-circle")
      .data(monthlyArray)
      .enter()
      .append("circle")
      .attr("class", "confirmed-circle")
      .attr("cx", d => getConfirmedCirclePos(d).cx)
      .attr("cy", d => getConfirmedCirclePos(d).cy)
      .attr("r", d => getClampedRadius(d.monthly_new_confirmed))
      .attr("stroke", "#e879f9")
      .attr("stroke-width", 1)
      .attr("fill", d => colorScaleConfirmed(d.monthly_new_confirmed))
      .append("title")
      .text(d => `${d.month}: ${d3.format(",.0f")(d.monthly_new_confirmed)} new cases`);
  
    // Add circles for monthly deceased cases
    svg.selectAll(".deceased-circle")
      .data(monthlyArray)
      .enter()
      .append("circle")
      .attr("class", "deceased-circle")
      .attr("cx", d => getDeceasedCirclePos(d).cx)
      .attr("cy", d => getDeceasedCirclePos(d).cy)
      .attr("r", d => getClampedRadius(d.monthly_new_deceased))
      .attr("stroke", "#93c5fd")
      .attr("stroke-width", 1)
      .attr("fill", d => colorScaleDeceased(d.monthly_new_deceased))
      .append("title")
      .text(d => `${d.month}: ${d3.format(",.0f")(d.monthly_new_deceased)} deaths`);
  
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
      .attr("font-size", 12)
      .attr("fill", "white")
      .text(d => d3.timeFormat("%Y")(d));
  
    // Add axis labels
    svg.append("text")
      .attr("x", width)
      .attr("y", height + 60)
      .attr("text-anchor", "end")
      .attr("font-family", "Arial")
      .attr("font-size", 14)
      .attr("fill", "white")
      .text("Time");
  
    svg.append("text")
      .attr("x", 10)
      .attr("y", 20)
      .attr("text-anchor", "start")
      .attr("font-family", "Arial")
      .attr("font-size", 14)
      .attr("fill", "#e879f9")
      .text("Confirmed Cases");
  
    svg.append("text")
      .attr("x", 10)
      .attr("y", height - 10)
      .attr("text-anchor", "start")
      .attr("font-family", "Arial")
      .attr("font-size", 14)
      .attr("fill", "#93c5fd")
      .text("Deceased Cases");
      
    // Add a legend for circle sizes
    const legendSizes = [1000000, 5000000, 10000000];
    const legendX = width - 200;
    const legendY = 50;
    
    svg.append("text")
      .attr("x", legendX)
      .attr("y", legendY - 20)
      .attr("text-anchor", "start")
      .attr("font-family", "Arial")
      .attr("font-size", 14)
      .attr("fill", "white")
      .text("Monthly New Cases");
    
    legendSizes.forEach((value, i) => {
      const radius = getClampedRadius(value);
      svg.append("circle")
        .attr("cx", legendX + 40)
        .attr("cy", legendY + i * 60 + 30)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 1);
        
      svg.append("text")
        .attr("x", legendX + radius + 50)
        .attr("y", legendY + i * 60 + 30)
        .attr("dominant-baseline", "middle")
        .attr("font-family", "Arial")
        .attr("font-size", 12)
        .attr("fill", "white")
        .text(d3.format(",.0f")(value));
    });
  }
}