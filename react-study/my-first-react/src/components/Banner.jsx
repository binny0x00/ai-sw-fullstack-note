function Banner({message}){
    if (!message) return null;

    return(
        <div style={{background: '#fffbcc', padding:'12px'}}>
            {message}
        </div>
    )
}

export default Banner;