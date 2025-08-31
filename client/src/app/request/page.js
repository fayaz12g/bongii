"use client";
import Header from '../components/header';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { requestsService } from "../services/requestsService";
import Background from '../components/background';
import Footer from '../components/footer';

// Utility to create a unique ID.
const createUniqueId = () => Date.now() + Math.random();

export default function RequestAid() {
  const router = useRouter();
  const [selectedAidType, setSelectedAidType] = useState(null);

  const [timeSlots, setTimeSlots] = useState([{ id: createUniqueId() }]);
  const [items, setItems] = useState([{ id: createUniqueId() }]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // When an aid type is selected, set the type and open the modal.
  const handleAidTypeClick = (type) => {
    setSelectedAidType(type);
    setIsModalOpen(true);
  };

  // Remove a time slot by its unique id.
  const removeTimeSlot = (idToRemove) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter((slot) => slot.id !== idToRemove));
    }
  };

  // Remove an item slot by its unique id.
  const removeItemSlot = (idToRemove) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== idToRemove));
    }
  };

  // Form submission 
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Get the link, title, and description.
    const link = formData.get("link");
    const title = formData.get("title");
    const body = formData.get("body");
    const tag = formData.get("tag");

    let payload = { link, title, body, tag };

    if (selectedAidType === 'time') {
      payload.timeSlots = timeSlots.map((slot) => ({
        start: formData.get(`timeSlotStart-${slot.id}`),
        end: formData.get(`timeSlotEnd-${slot.id}`)
      }));
      requestsService.requestTime(payload).then(data => {
          return data.json()
      }
    )
    .then(data => {
      router.push(`/times/${data.id}`);
  });
    
    }

    if (selectedAidType === 'money') {
      payload.goal = formData.get("goal");
      requestsService.requestFinance(payload).then(data => {
        return data.json()
    }
  )
  .then(data => {
    router.push(`/finance/${data.id}`);
});
  
  }

    if (selectedAidType === 'items') {
      payload.items = items.map((item) => ({
        name: formData.get(`item-${item.id}`),
        quantity: formData.get(`itemQuantity-${item.id}`)
      }));
      requestsService.requestItems(payload).then(data => {
        return data.json()
    }
  )
  .then(data => {
    router.push(`/items/${data.id}`);
});
  
  }

    console.log(payload);
    // Close the modal after submission.
    setIsModalOpen(false);
  };

  // Functions to add additional fields.
  const addTimeSlot = () => setTimeSlots([...timeSlots, { id: createUniqueId() }]);
  const addItem = () => setItems([...items, { id: createUniqueId() }]);

  return (
    <div>
      <Header />
      <Background />
      {/* <Footer /> */}
      <br /><br /><br />
      <div className="max-w-6xl mx-auto space-y-12 py-12">
        <h1 className="text-4xl font-bold text-white text-center">Request Assistance</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Section */}
          <div className="bg-gray-800 flex flex-col justify-center items-center text-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-semibold text-center mb-4">We're Here to Help</h2>
          <p className="text-lg mb-4 text-center"><i>What type of assistance do you need?</i></p>
          <p className="text-center">
            Let us know what kind of support you require and we'll help connect you with volunteers.
            <br />
            <br />
            Select an assistance type to get started.
          </p>
        </div>


          {/* Right Section – Aid Type Selection Buttons */}
          <div className="space-y-6 justify-center items-center">
            <button
              onClick={() => handleAidTypeClick('time')}
              className="w-full bg-gray-700 p-6 rounded-xl shadow-lg text-white hover:bg-gray-600 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex justify-center items-center text-lg">🕒</div>
                <div>
                  <h3 className="text-xl font-semibold">Request Time Assistance</h3>
                  <p className="text-sm">Need volunteers for specific time slots</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleAidTypeClick('money')}
              className="w-full bg-gray-700 p-6 rounded-xl shadow-lg text-white hover:bg-gray-600 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex justify-center items-center text-lg">💵</div>
                <div className='items-left'>
                  <h3 className="text-xl font-semibold">Request Financial Assistance</h3>
                  <p className="text-sm">Set up a financial goal for your needs</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleAidTypeClick('items')}
              className="w-full bg-gray-700 p-6 rounded-xl shadow-lg text-white hover:bg-gray-600 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex justify-center items-center text-lg">📦</div>
                <div>
                  <h3 className="text-xl font-semibold">Request Items</h3>
                  <p className="text-sm">List specific items you need donated</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Popup for the Request Form */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setIsModalOpen(false)}
          ></div>
          {/* Modal Content */}
          <div className="bg-gray-800 p-6 rounded-2xl shadow-lg z-50 max-w-2xl w-full relative">
            {/* Close Button */}
            <button
              className="absolute top-2 right-2 text-white text-2xl"
              onClick={() => setIsModalOpen(false)}
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              Submit Your Tale
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Title Field */}
              <div>
                <label className="block text-white mb-2">Title <span className="text-red-500">*</span></label> 
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full bg-gray-700 text-white p-2 rounded"
                />
              </div>
              
              {/* Description Field */}
              <div>
                <label className="block text-white mb-2">Tell Your Tale <span className="text-red-500">*</span></label> 
                <textarea
                  name="body"
                  required
                  className="w-full bg-gray-700 text-white p-2 rounded h-32"
                />
              </div>
              {/* Link Field */}
              <div>
                <label className="block text-white mb-2">Link</label>
                <input
                  type="url"
                  name="link"
                  className="w-full bg-gray-700 text-white p-2 rounded"
                  placeholder="https://example.com"
                />
              </div>
              {/* Conditional Fields Based on Selected Aid Type */}
              {selectedAidType === 'time' && (
                <div>
                  <label className="block text-white mb-2">Time Slots Needed <span className="text-red-500">*</span></label>
                  {timeSlots.map((slot, index) => (
                    <div key={slot.id} className="flex items-center space-x-2 mb-2">
                      <span className="text-white">Start:</span>
                      <input
                        type="datetime-local"
                        name={`timeSlotStart-${slot.id}`}
                        required
                        className="bg-gray-700 text-white p-2 rounded"
                      />
                      <span className="text-white">End:</span>
                      <input
                        type="datetime-local"
                        name={`timeSlotEnd-${slot.id}`}
                        required
                        className="bg-gray-700 text-white p-2 rounded"
                      />
                      {timeSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(slot.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTimeSlot}
                    className="text-white bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700"
                  >
                    Add Another Time Slot
                  </button>
                </div>
              )}

              {selectedAidType === 'money' && (
                <div>
                  <label className="block text-white mb-2">Financial Goal ($) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="goal"
                    required
                    min="1"
                    className="w-full bg-gray-700 text-white p-2 rounded"
                  />
                </div>
              )}

              {selectedAidType === 'items' && (
                <div>
                  <label className="block text-white mb-2">Items Needed <span className="text-red-500">*</span></label>
                  {items.map((item, index) => (
                    <div key={item.id} className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        name={`item-${item.id}`}
                        required
                        className="w-full bg-gray-700 text-white p-2 rounded"
                        placeholder="Item name"
                      />
                      <input
                        type="number"
                        name={`itemQuantity-${item.id}`}
                        required
                        min="1"
                        className="w-full bg-gray-700 text-white p-2 rounded"
                        placeholder="Quantity"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemSlot(item.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-white bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700"
                  >
                    Add Another Item
                  </button>
                </div>
              )}
              {/* Tag Dropdown */}
              <div>
                <label className="block text-white mb-2">Tag your post <span className="text-red-500">*</span></label>
                <select
                  name="tag"
                  className="w-full bg-gray-700 text-white p-2 rounded"
                  required
                >
                  {selectedAidType === 'time' && (
                    <>
                      <option value="volunteer">Volunteer</option>
                      <option value="community support">Community Support</option>
                      <option value="education">Education</option>
                    </>
                  )}
                  {selectedAidType === 'money' && (
                    <>
                      <option value="fundraising">Fundraising</option>
                      <option value="charity">Charity</option>
                      <option value="emergency assistance">Emergency Assistance</option>
                    </>
                  )}
                  {selectedAidType === 'items' && (
                    <>
                      <option value="donation">Donation</option>
                      <option value="supplies">Supplies</option>
                      <option value="equipment">Equipment</option>
                    </>
                  )}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Submit Tale
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
