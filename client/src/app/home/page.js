"use client";
import React from 'react';
import Header from '../components/header';
import Background from '../components/background';
import { BackgroundProvider } from "../components/context";
import Footer from '../components/footer';

const HomePage = () => {
  return (
    <div>
      <Header />
      <Background />
      {/* <Footer /> */}
      <br />

      <main className="max-w-5xl mx-auto p-6 mt-24">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">Welcome to Bongii</h1>
          <p className="text-lg text-gray-300 mb-8">
            Bongii is a modern, interactive bingo-style platform designed to bring creativity, fun, and friendly competition together.
          </p>
        </div>

        <section className="bg-white/10 rounded-xl p-8 shadow-lg mb-8">
          <h2 className="text-3xl font-semibold mb-4 text-center">Create Campaigns</h2>
          <p className="text-gray-200 mb-2">
            Logged-in users can create unique Bongii campaigns with fully customizable boards:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>Set board sizes from 3x3 to 5x5.</li>
            <li>Choose animated backgrounds and gradient colors.</li>
            <li>Add multiple categories and options, including required, optional, or free-choice tiles.</li>
            <li>Set a start date and time, and generate a unique campaign code to share with players.</li>
          </ul>
        </section>

        <section className="bg-white/10 rounded-xl p-8 shadow-lg mb-8">
          <h2 className="text-3xl font-semibold mb-4 text-center">Play Bongii</h2>
          <p className="text-gray-200 mb-2">
            Players can join campaigns using a unique code and build their own boards by selecting tiles:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>Select tiles from "choose many" or "select one" categories.</li>
            <li>Rearrange tiles and customize your free space with your name.</li>
            <li>Play in real-time as the campaign progresses, with tiles marked correct or incorrect live.</li>
            <li>Compete to spell "BONGII" across your board for the win!</li>
          </ul>
        </section>

        <section className="bg-white/10 rounded-xl p-8 shadow-lg mb-8">
          <h2 className="text-3xl font-semibold mb-4 text-center">Moderate Campaigns</h2>
          <p className="text-gray-200 mb-2">
            Campaign creators can moderate and manage live campaigns:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>Assign correct or incorrect to tiles in real-time.</li>
            <li>Track the progress of all players' boards simultaneously.</li>
            <li>End the campaign and declare the winner based on completed BONGII rows.</li>
          </ul>
        </section>

        <div className="text-center mt-12">
          <p className="text-gray-400 italic">
            Bongii makes every campaign engaging, interactive, and uniquely yours. Whether creating, playing, or moderating, the fun is in the experience!
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
