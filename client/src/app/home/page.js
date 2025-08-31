"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import Background from '../components/background';
import Header from '../components/header';
import Footer from '../components/footer';

const HomePage = () => {
  const router = useRouter();

  return (
    <div>
      <Header />
      <Background />
      {/* <Footer /> */}
      <br />
      <br />
      <br />
      <br />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-4xl font-bold text-white text-center">Local Resources</h1>
        <h1 className="text-xl font-itallic text-white text-center mb-12"><i>(Raleigh, NC)<i/></i></h1>
        
        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-12">
          <button 
            onClick={() => router.push('/request')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            Request Assistance
          </button>
          <button 
            onClick={() => router.push('/volunteer')}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            Volunteer to Help
          </button>
        </div>

        {/* Resource Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Food Resources */}
          <div className="bg-white/10 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-white">Food Resources</h2>
            <ul className="space-y-3">
              <li>
                <a href="https://raleighdreamcenter.org/resources/" className="text-blue-500 hover:underline block">
                  <div className="font-medium">Mobile Food Pantry</div>
                  <div className="text-sm text-gray-300">Raleigh Dream Center</div>
                </a>
              </li>
              <li>
                <a href="https://wwcm.org/volunteer/" className="text-blue-500 hover:underline block">
                  <div className="font-medium">Western Wake Crisis Ministry</div>
                  <div className="text-sm text-gray-300">Food Pantry Services</div>
                </a>
              </li>
              <li>
                <a href="https://tableraleigh.org" className="text-blue-500 hover:underline block">
                  <div className="font-medium">A Place at the Table</div>
                  <div className="text-sm text-gray-300">Pay-what-you-can Cafe</div>
                </a>
              </li>
              <li>
                <a href="https://www.wakemow.org/volunteer" className="text-blue-500 hover:underline block">
                  <div className="font-medium">Meals on Wheels</div>
                  <div className="text-sm text-gray-300">Senior Food Delivery</div>
                </a>
              </li>
            </ul>
          </div>

          {/* Housing Resources */}
          <div className="bg-white/10 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-white">Housing & Shelter</h2>
            <ul className="space-y-3">
              <li>
                <a href="https://oakcitycares.org/" className="text-blue-500 hover:underline block">
                  <div className="font-medium">Oak City Cares</div>
                  <div className="text-sm text-gray-300">Housing for Homeless</div>
                </a>
              </li>
              <li>
                <a href="https://www.familypromisetriangle.org/" className="text-blue-500 hover:underline block">
                  <div className="font-medium">Family Promise Triangle</div>
                  <div className="text-sm text-gray-300">Family Shelter Services</div>
                </a>
              </li>
              <li>
                <a href="https://www.habitatwake.org/volunteer" className="text-blue-500 hover:underline block">
                  <div className="font-medium">Habitat for Humanity</div>
                  <div className="text-sm text-gray-300">Housing Construction & Support</div>
                </a>
              </li>
            </ul>
          </div>

          {/* Community Centers */}
          <div className="bg-white/10 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-white">Community Support</h2>
            <ul className="space-y-3">
              <li>
                <a href="https://raleighnc.gov/parks-and-recreation/services/find-community-center" className="text-blue-500 hover:underline block">
                  <div className="font-medium">Raleigh Community Centers</div>
                  <div className="text-sm text-gray-300">Local Programs & Services</div>
                </a>
              </li>
              <li>
                <a href="https://www.lgbtcenterofraleigh.com/volunteer" className="text-blue-500 hover:underline block">
                  <div className="font-medium">LGBT Center of Raleigh</div>
                  <div className="text-sm text-gray-300">LGBTQ+ Support Services</div>
                </a>
              </li>
              <li>
                <a href="https://www.wcwc.org/getinvolved" className="text-blue-500 hover:underline block">
                  <div className="font-medium">The Women's Center</div>
                  <div className="text-sm text-gray-300">Women's Support Services</div>
                </a>
              </li>
            </ul>
          </div>

          {/* Government Services */}
          <div className="bg-white/10 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-white">Government Services</h2>
            <ul className="space-y-3">
              <li>
                <a href="https://www.wake.gov/departments-government/health-human-services/programs-assistance" className="text-blue-500 hover:underline block">
                  <div className="font-medium">Wake County Human Services</div>
                  <div className="text-sm text-gray-300">Programs & Assistance</div>
                </a>
              </li>
              <li>
                <a href="https://www.ncdhhs.gov/eipd" className="text-blue-500 hover:underline block">
                  <div className="font-medium">NC DHHS</div>
                  <div className="text-sm text-gray-300">Disability Services</div>
                </a>
              </li>
              <li>
                <a href="https://gotriangle.org/access" className="text-blue-500 hover:underline block">
                  <div className="font-medium">GoTriangle</div>
                  <div className="text-sm text-gray-300">Accessible Transportation</div>
                </a>
              </li>
            </ul>
          </div>

          {/* Environmental */}
          <div className="bg-white/10 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-white">Environmental</h2>
            <ul className="space-y-3">
              <li>
                <a href="https://raleighnc.gov/stormwater/services/stormwater-volunteering" className="text-blue-600 hover:underline block">
                  <div className="font-medium">Stormwater Volunteering</div>
                  <div className="text-sm text-gray-300">City of Raleigh</div>
                </a>
              </li>
              <li>
                <a href="https://www.ncdot.gov/initiatives-policies/environmental/Pages/default.aspx" className="text-blue-600 hover:underline block">
                  <div className="font-medium">Environmental Initiatives</div>
                  <div className="text-sm text-gray-300">NCDOT</div>
                </a>
              </li>
              <li>
                <a href="https://sustainability.ncsu.edu/get-involved/service-opportunities/" className="text-blue-600 hover:underline block">
                  <div className="font-medium">Sustainability </div>
                  <div className="text-sm text-gray-300">NC State University</div>
                </a>
              </li>
              <li>
                <a href="https://raleighcityfarm.org/volunteer" className="text-blue-600 hover:underline block">
                  <div className="font-medium">Raleigh City Farm</div>
                  <div className="text-sm text-gray-300">Urban Farming Initiative</div>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;