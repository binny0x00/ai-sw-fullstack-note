function Card({children}){
    return(
        <div className="card" style={{border: '1px solid #ccc', padding:'16px', borderRadius: '8px'}}>
            {children}
        </div>
    );
}

export default Card;