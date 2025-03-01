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
    const maxNewConfirmed = d3.max(data, d => d.new_confirmed);
    const maxNewDeceased = d3.max(data, d => d.new_deceased);
    
    // Allocate space proportionally
    const confirmedRatio = 0.6; // Give confirmed cases 60% of the space
    const deceasedRatio = 0.4; // Give deceased cases 40% of the space
    
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
  
    // Create line generators for the four lines
    const confirmedCumulativeLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScaleConfirmed(d.cumulative_confirmed))
      .curve(d3.curveMonotoneX);
  
    const confirmedNewLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScaleConfirmed(d.new_confirmed))
      .curve(d3.curveMonotoneX);
  
    const deceasedCumulativeLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => centerlineY + yScaleDeceased(d.cumulative_deceased))
      .curve(d3.curveMonotoneX);
  
    const deceasedNewLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => centerlineY + yScaleDeceased(d.new_deceased))
      .curve(d3.curveMonotoneX);
  
    // Add the lines
    // Cumulative confirmed line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#e879f9")
      .attr("stroke-width", 2.5)
      .attr("d", confirmedCumulativeLine);
  
    // New confirmed line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#e879f9")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,3")
      .attr("d", confirmedNewLine);
  
    // Cumulative deceased line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#93c5fd")
      .attr("stroke-width", 2.5)
      .attr("d", deceasedCumulativeLine);
  
    // New deceased line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#93c5fd")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,3")
      .attr("d", deceasedNewLine);
  
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
      
    // Add a legend
    const legendX = width - 250;
    const legendY = 50;
    
    // Legend title
    svg.append("text")
      .attr("x", legendX)
      .attr("y", legendY - 20)
      .attr("text-anchor", "start")
      .attr("font-family", "Arial")
      .attr("font-size", "14px")
      .attr("fill", "white")
      .text("Legend");
      
    // Confirmed cases legend - cumulative
    svg.append("line")
      .attr("x1", legendX)
      .attr("y1", legendY)
      .attr("x2", legendX + 20)
      .attr("y2", legendY)
      .attr("stroke", "#e879f9")
      .attr("stroke-width", 2.5);
      
    svg.append("text")
      .attr("x", legendX + 30)
      .attr("y", legendY)
      .attr("dominant-baseline", "middle")
      .attr("font-family", "Arial")
      .attr("font-size", "12px")
      .attr("fill", "white")
      .text("Cumulative Confirmed");
      
    // Confirmed cases legend - new
    svg.append("line")
      .attr("x1", legendX)
      .attr("y1", legendY + 25)
      .attr("x2", legendX + 20)
      .attr("y2", legendY + 25)
      .attr("stroke", "#e879f9")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,3");
      
    svg.append("text")
      .attr("x", legendX + 30)
      .attr("y", legendY + 25)
      .attr("dominant-baseline", "middle")
      .attr("font-family", "Arial")
      .attr("font-size", "12px")
      .attr("fill", "white")
      .text("New Confirmed Cases");
      
    // Deceased cases legend - cumulative
    svg.append("line")
      .attr("x1", legendX)
      .attr("y1", legendY + 60)
      .attr("x2", legendX + 20)
      .attr("y2", legendY + 60)
      .attr("stroke", "#93c5fd")
      .attr("stroke-width", 2.5);
      
    svg.append("text")
      .attr("x", legendX + 30)
      .attr("y", legendY + 60)
      .attr("dominant-baseline", "middle")
      .attr("font-family", "Arial")
      .attr("font-size", "12px")
      .attr("fill", "white")
      .text("Cumulative Deceased");
      
    // Deceased cases legend - new
    svg.append("line")
      .attr("x1", legendX)
      .attr("y1", legendY + 85)
      .attr("x2", legendX + 20)
      .attr("y2", legendY + 85)
      .attr("stroke", "#93c5fd")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,3");
      
    svg.append("text")
      .attr("x", legendX + 30)
      .attr("y", legendY + 85)
      .attr("dominant-baseline", "middle")
      .attr("font-family", "Arial")
      .attr("font-size", "12px")
      .attr("fill", "white")
      .text("New Deceased Cases");
  
    // Add window resize listener for vertical adjustments
    window.addEventListener('resize', function() {
      // Clear the visualization
      d3.select("#visualization").html("");
      // Recreate with new height
      createCovidVisualization(data);
    });
  }