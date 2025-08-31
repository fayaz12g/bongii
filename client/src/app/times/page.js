"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { volunteerService } from "../services/volunteerService";
import Header from "../components/header";
import Background from "../components/background";
import Select from "react-select"; // Multi-select component for tags
import DatePicker from "react-datepicker"; // Date range picker
import "react-datepicker/dist/react-datepicker.css";

export default function TimeAssistancePage() {
  const [timeData, setTimeData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [tags, setTags] = useState([]); // Holds all available tags
  const [selectedTags, setSelectedTags] = useState([]); // Tracks selected tags for filtering
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [filterStatus, setFilterStatus] = useState("open"); 

  useEffect(() => {
    async function fetchTimeData() {
      try {
        const res = await volunteerService.getTime();
        const data = await res.json();
        console.log(data);
        setTimeData(data);
        setFilteredData(data);

        const allTags = Array.from(new Set(data.flatMap(post => post.tag || [])));
        setTags(allTags.map(tag => ({ label: tag, value: tag })));
      } catch (error) {
        console.error("Error fetching time data:", error);
      }
    }
    fetchTimeData();
  }, []);

  // Filter posts by selected tags and date range
  useEffect(() => {
    const filteredPosts = timeData.filter(post => {
      if (selectedTags.length === 0) return true; 
      const matchesTags = selectedTags.some(tag => tag.value === post.tag);

      const matchesDateRange =
        (!startDate || new Date(post.timeSlots[0].start) >= startDate) &&
        (!endDate || new Date(post.timeSlots[0].end) <= endDate);

      return matchesTags && matchesDateRange;
    });

    setFilteredData(filteredPosts);
  }, [selectedTags, startDate, endDate, timeData]);

  const handleTagChange = (selectedOptions) => {
    setSelectedTags(selectedOptions ? selectedOptions.map(option => option.value) : []);
  };

  const formatDateTime = (dateTimeStr) => {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    const date = new Date(dateTimeStr);
    return date.toLocaleString(undefined, options);
  };

  return (
    <div>
      <Header />
      <Background />
      <br />
      <br />
      <br />
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Volunteer Your Time!
        </h1>

        {/* Filters Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
          <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:space-x-6">
            {/* Tag Selector */}
            <div className="w-full md:w-1/2">
              <h3 className="text-white font-bold mb-2">Filter by Tags</h3>
              <Select
                isMulti
                value={tags.filter(tag => selectedTags.includes(tag.value))} // Display selected tags
                onChange={handleTagChange}
                options={tags} 
                className="text-black"
                placeholder="Select Tags"
              />
            </div>
            <div className="mt-4">
            <h3 className="text-white font-bold mb-2">Filter by Status</h3>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-700 text-white rounded-md p-2"
            >
              <option value="open">Open Posts</option>
              <option value="completed">Completed Posts</option>
              <option value="all">All Posts</option>
            </select>
          </div>

            {/* Date Range Picker */}
            <div className="w-full md:w-1/2">
              <h3 className="text-white font-bold mb-2">Filter by Date Range</h3>
              <div className="flex space-x-4">
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  placeholderText="Start Date"
                  className="text-black p-2 rounded-md"
                />
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  placeholderText="End Date"
                  className="text-black p-2 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Display Posts */}
        {filteredData.length === 0 ? (
          <p className="text-white text-center">No time posts available.</p>
        ) : (
          filteredData.map((post) => (
            <div
              key={post.id}
              className="bg-gray-800 p-6 rounded-2xl shadow-lg text-white mb-6"
            >
              <h2 className="text-2xl font-bold mb-2">{post.title}</h2>
              <p className="mb-4">{post.body}</p>
              {post.timeSlots && post.timeSlots.length > 0 && (
                <div className="mb-4">
                  {post.timeSlots.map((slot, i) => (
                    <div key={i} className="flex items-center mb-1">
                      <span className="font-bold">Start:</span>
                      <span className="ml-2">{formatDateTime(slot.start)}</span>
                      <span className="font-bold ml-4">End:</span>
                      <span className="ml-2">{formatDateTime(slot.end)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex space-x-4">
                {post.link && (
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    Visit Link
                  </a>
                )}
                <Link href={`/times/${post.id}`} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md">
                    View Full Post
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
