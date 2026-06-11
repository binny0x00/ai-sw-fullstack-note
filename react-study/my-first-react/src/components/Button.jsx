function Button({label, onClick}){
    return(
        <button onClick={onClick} style={{padding: '8px 16px'}}>
            {label}
        </button>
    );
}

export default Button;