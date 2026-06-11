function Notification({unreadCount}){
    return(
      <div>
          <h2>알림</h2>
          {unreadCount > 0 && (<p>읽지 않은 메시지가 {unreadCount}개 있습니다.</p>)}
      </div>
    );
}

export default Notification;