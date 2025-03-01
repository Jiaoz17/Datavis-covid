// This modified version maintains the original design but fixes the scaling issue
// so daily cases are properly proportional to cumulative cases

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
    
    // Apply moving average to smooth out daily data
    const smoothedData = smoothData(data, 7); // 7-day moving average
  
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
    
    // Find max daily values
    const maxDailyConfirmed = d3.max(smoothedData, d => d.new_confirmed_smoothed);
    const maxDailyDeceased = d3.max(smoothedData, d => d.new_deceased_smoothed);
    
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
      
    // FIXED: Use the same scale for daily values as for cumulative values
    // This ensures the visualization accurately represents the relative sizes
    
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
  
    // FIXED: Create offset data with proper scaling
    // The key change: Use the same scale for both daily and cumulative values
    const confirmedOffsetData = smoothedData.map(d => {
      // Get the y position of the cumulative line
      const cumY = yScaleConfirmed(d.cumulative_confirmed);
      // Calculate what the position would be if we added daily cases to it
      // But we use the SAME SCALE as the cumulative line
      const dailyY = yScaleConfirmed(d.new_confirmed_smoothed);
      // The offset is the difference between the cumulative position and what
      // the position would be if we moved by the daily cases amount
      const offset = Math.abs(dailyY - yScaleConfirmed(0)) * 0.5; // Use 0.5 as a scaling factor to make it visible but proportional
      
      return {
        date: d.date,
        y0: cumY, // Start at the cumulative line
        y1: cumY - offset // Move towards lower y values (up in SVG)
      };
    });
    
    const deceasedOffsetData = smoothedData.map(d => {
      const cumY = centerlineY + yScaleDeceased(d.cumulative_deceased);
      const dailyY = yScaleDeceased(d.new_deceased_smoothed);
      const offset = Math.abs(dailyY - yScaleDeceased(0)) * 0.5; // Same scaling factor for consistency
      
      return {
        date: d.date,
        y0: cumY, // Start at the cumulative line
        y1: cumY + offset // Move towards higher y values (down in SVG)
      };
    });
  
    // Create line generators
    const confirmedLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScaleConfirmed(d.cumulative_confirmed))
      .curve(d3.curveMonotoneX);
  
    const confirmedOffsetLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => d.y1)
      .curve(d3.curveMonotoneX);
  
    const deceasedLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => centerlineY + yScaleDeceased(d.cumulative_deceased))
      .curve(d3.curveMonotoneX);
      
    const deceasedOffsetLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => d.y1)
      .curve(d3.curveMonotoneX);
  
    // Create area generators
    const confirmedArea = d3.area()
      .x(d => xScale(d.date))
      .y0(d => d.y0)
      .y1(d => d.y1)
      .curve(d3.curveMonotoneX);
      
    const deceasedArea = d3.area()
      .x(d => xScale(d.date))
      .y0(d => d.y0)
      .y1(d => d.y1)
      .curve(d3.curveMonotoneX);
  
    // Add the filled areas
    svg.append("path")
      .datum(confirmedOffsetData)
      .attr("fill", "#e879f9")
      .attr("fill-opacity", 0.6)
      .attr("d", confirmedArea);
      
    svg.append("path")
      .datum(deceasedOffsetData)
      .attr("fill", "#93c5fd")
      .attr("fill-opacity", 0.6)
      .attr("d", deceasedArea);
  
    // Add the offset lines
    svg.append("path")
      .datum(confirmedOffsetData)
      .attr("fill", "none")
      .attr("stroke", "#e879f9")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.9)
      .attr("d", confirmedOffsetLine);
      
    svg.append("path")
      .datum(deceasedOffsetData)
      .attr("fill", "none")
      .attr("stroke", "#93c5fd")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.9)
      .attr("d", deceasedOffsetLine);
  
    // Add the cumulative lines
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#e879f9")
      .attr("stroke-width", 2.5)
      .attr("d", confirmedLine);
  
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#93c5fd")
      .attr("stroke-width", 2.5)
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
      
    // Add a legend for the daily data
    const legendX = width - 220;
    const legendY = 50;
    
    svg.append("text")
      .attr("x", legendX)
      .attr("y", legendY - 20)
      .attr("text-anchor", "start")
      .attr("font-family", "Arial")
      .attr("font-size", "14px")
      .attr("fill", "white")
      .text("Daily New Cases (7-day avg)");
      
    // Confirmed cases legend
    svg.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", "#e879f9")
      .attr("fill-opacity", 0.6);
      
    svg.append("text")
      .attr("x", legendX + 30)
      .attr("y", legendY + 10)
      .attr("dominant-baseline", "middle")
      .attr("font-family", "Arial")
      .attr("font-size", "12px")
      .attr("fill", "white")
      .text("New Confirmed Cases");
      
    // Deceased cases legend
    svg.append("rect")
      .attr("x", legendX)
      .attr("y", legendY + 30)
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", "#93c5fd")
      .attr("fill-opacity", 0.6);
      
    svg.append("text")
      .attr("x", legendX + 30)
      .attr("y", legendY + 40)
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
  
  // Function to calculate moving average
  function smoothData(data, windowSize) {
    const result = [];
    
    for (let i = 0; i < data.length; i++) {
      let confirmedSum = 0;
      let deceasedSum = 0;
      let count = 0;
      
      // Calculate moving average
      for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
        confirmedSum += data[j].new_confirmed;
        deceasedSum += data[j].new_deceased;
        count++;
      }
      
      result.push({
        date: data[i].date,
        cumulative_confirmed: data[i].cumulative_confirmed,
        cumulative_deceased: data[i].cumulative_deceased,
        new_confirmed_smoothed: confirmedSum / count,
        new_deceased_smoothed: deceasedSum / count
      });
    }
    
    return result;
  }