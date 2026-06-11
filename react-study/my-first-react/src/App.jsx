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
import InputDemo from './components/InputDemo.jsx'
import SearchBox from './components/SearchBox.jsx'
import LoginForm from "./components/LoginForm.jsx";
import Button from "./components/Button.jsx";
import Toggle from "./components/Toggle.jsx";
import MessageForm from "./components/MessageForm.jsx";
import LoginButton from "./components/LoginButton.jsx";
import UserStatus from "./components/UserStatus.jsx";
import Notification from "./components/Notification.jsx";
import Banner from "./components/Banner.jsx";
import Page from "./components/Page.jsx";
import FruitList from "./components/FruitList.jsx";
import TodoList from "./components/TodoList.jsx";

function App() {

  return(
    <>
        <TodoList/>
    </>
  );
}

export default App
