import React from 'react';
import '../App.css';
import { Link, useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const router = useNavigate();

  return (
    <div className="landingPageContainer">
      <nav className="landingNav">
        <div className="brandBlock" onClick={() => router('/')}>
          <div className="brandIcon">A</div>
          <div>
            <h2>Apna Video Call</h2>
            <span>Secure video meetings</span>
          </div>
        </div>

        <div className="navlist">
          <p onClick={() => router('/guest-room')}>Join as Guest</p>
          <p onClick={() => router('/auth')}>Register</p>
          <button onClick={() => router('/auth')}>Login</button>
        </div>
      </nav>

      <main className="landingMainContainer">
        <section className="heroCopy">
          <div className="pill">HD calls • Live chat • Screen sharing</div>
          <h1>
            Connect with your team, friends and family in one professional meeting space.
          </h1>
          <p>
            Create private rooms, join instantly with a meeting code, chat during calls and keep your meeting history safely organized.
          </p>
          <div className="heroActions">
            <Link className="primaryCta" to="/auth">Get Started</Link>
            <button className="secondaryCta" onClick={() => router('/quick-meet')}>Join as Guest</button>
          </div>
          <div className="heroStats">
            <span><b>1-click</b> joining</span>
            <span><b>WebRTC</b> powered</span>
            <span><b>Realtime</b> chat</span>
          </div>
        </section>

        <section className="heroVisual">
          <div className="mockWindow">
            <div className="mockTop"><span></span><span></span><span></span></div>
            <div className="mockGrid">
              <div className="tile big">Host</div>
              <div className="tile">Guest 1</div>
              <div className="tile">Guest 2</div>
              <div className="tile accent">Chat</div>
            </div>
            <div className="mockControls">
              <span></span><span></span><span className="end"></span><span></span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
