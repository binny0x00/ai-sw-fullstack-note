import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import dayjs from 'dayjs'
import Greeting from './components/Greeting.jsx'
import UserCard from './components/UserCard.jsx'
import Card from './components/Card'
import Counter from './components/Counter.jsx'
import User from './components/User.jsx'

function App() {
  return(
    <>
      <h1>정보 수정</h1>
      <User />
    </>
  );
}

export default App
