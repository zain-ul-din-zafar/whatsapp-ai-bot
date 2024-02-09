const useLimitedRequests = (timeInMs: number, requestAllowed: number) => {
    const map: {
        [key: string]: {
            count: number,
            lastRequestTime: Date
        }
    } = {};
    
    return (sender: string) => {
      if (map[sender] == undefined) {
        map[sender] = {
          count: 0,
          lastRequestTime: new Date(),
        };
      }
      
      const { count, lastRequestTime } = map[sender];
      const elapsedTime = new Date().getTime() - lastRequestTime.getTime();
      
      if (elapsedTime >= timeInMs) {
        map[sender] = { count: 1, lastRequestTime: new Date() };
        return true;
      }
  
      if (count >= requestAllowed) {
        return false;
      }
  
      map[sender] = { count: count + 1, lastRequestTime };
      return true;
    };
};

export default useLimitedRequests;
  
