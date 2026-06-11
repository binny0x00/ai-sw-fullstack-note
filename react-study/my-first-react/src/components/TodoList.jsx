import {useState} from "react";
import TodoItem from "./TodoItem";

function TodoList() {
    const [todos, setTodos] = useState([
        {id:'a1', text: '리액트 공부'},
        {id:'a2', text: '운동하기'},
        {id:'a3', text: '책 읽기'},
    ]);
    return (
        <ul>
            {todos.map((todo) => (
                <TodoItem key={todo.id} todo={todo}/>
            ))}
        </ul>
    );
}

export default TodoList;