function TodoItem({todo}){
    return(
        <li>
            <strong>{todo.text}</strong>. {todo.completed ? '완료' : '진행 중'}
        </li>
    );
}

export default TodoItem;