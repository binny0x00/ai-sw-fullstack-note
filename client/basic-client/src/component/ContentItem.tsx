function ContentItem({title = '-', isMine = true}){
    return(
        <div style={{borderBottom: '1px solid #ccc', margin: '3px', display: 'flex'}}>
            <p>{title} {isMine && <button style={{marginLeft: 'auto'}}>수정하기</button>}</p>
        </div>
    );
}

export default ContentItem;