function UserCard({name, age, hobbies, isOnline=false}){
    return(
        <div style={{border: '1px solid #ccc', padding:'12px',margin:'8px', borderRadius: '8px'}}>
            <h2>{isOnline && '🟢'} {name} ({age}세)</h2>
            <p>취미: {hobbies.join(', ')}</p>
        </div>
    );
}

export default UserCard;