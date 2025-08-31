"use client";

import { useEffect, useState } from "react";
import { volunteerService } from "../services/volunteerService";
import Link from "next/link";
import Header from "../components/header";
import Background from "../components/background";
import Select from "react-select"; 
import Footer from "../components/footer"

export default function ItemsAssistancePage() {
  const [itemsData, setItemsData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [filterStatus, setFilterStatus] = useState("open"); // "open", "completed", "all"

  useEffect(() => {
    async function fetchItemsData() {
      try {
        const res = await volunteerService.getItems();
        const data = await res.json();
        setItemsData(data);
        setFilteredData(data);

        // Extract unique tags from the fetched data
        const allTags = Array.from(new Set(data.flatMap(post => post.tag || [])));
        setTags(allTags.map(tag => ({ label: tag, value: tag })));
      } catch (error) {
        console.error("Error fetching items data:", error);
      }
    }
    fetchItemsData();
  }, []);

  // Filter the posts by selected tags and post completion status
  useEffect(() => {
    const filteredPosts = itemsData.filter(post => {
      const tagMatch =
        selectedTags.length === 0 || selectedTags.some(tag => tag.value === post.tag);
      const statusMatch =
        filterStatus === "all" ||
        (filterStatus === "open" && !post.completed) ||
        (filterStatus === "completed" && post.completed);

      return tagMatch && statusMatch;
    });

    setFilteredData(filteredPosts);
  }, [selectedTags, filterStatus, itemsData]);

  return (
    <div>
      <Header />
      <Background />
      {/* <Footer /> */}
      <br />
      <br />
      <br />
      <div className="max-w-6xl mx-auto py-12">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Items Assistance Posts
        </h1>

        {/* Filters Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
            <h3 className="text-white font-bold mb-2">Filter by Tags</h3>
            <Select
              isMulti
              options={tags}
              value={selectedTags}
              onChange={setSelectedTags}
              placeholder="Select Tags"
              className="bg-gray-700 text-black rounded-md"
            />
          

          {/* Filter by Completion Status */}
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
        </div>


        {filteredData.length === 0 ? (
          <p className="text-white text-center">No items posts available.</p>
        ) : (
          filteredData.map((post, index) => (
            <div
              key={index}
              className="bg-gray-800 p-6 rounded-2xl shadow-lg text-white mb-4"
            >
              <h2 className="text-2xl font-bold">{post.title}</h2>
              <p>{post.body}</p>
              {post.items &&
                post.items.map((item, i) => (
                  <div key={i} className="mt-2">
                    <span className="font-bold">Item:</span> {item.name}{" "}
                    <span className="font-bold">Quantity:</span> {item.quantity}
                  </div>
                ))}
                <br />
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
              <Link href={`/items/${post.id}`} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md">
                View Full Post
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
