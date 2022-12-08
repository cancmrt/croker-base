import * as cheerio from 'cheerio'
import axios from 'axios'

export const HttpMethodType = {
  GET: 'GET',
  POST: 'POST'
}

export class CrawlerLoader {
  URL = ''
  HttpMethod = HttpMethodType.GET
};

export class CrawlerResult {
  URL = ''
  HttpMethod = HttpMethodType.GET
  PageHTML = ''
  Document = undefined
  IsError = true
  Error = undefined
};
export class CrawlerResultJSON {
  URL = ''
  HttpMethod = HttpMethodType.GET
  JSON = ''
  IsError = true
  Error = undefined
};

export class CrokerCrawler {
  RemoveTagAndWhiteSpaces (html) {
    return html.replace(/(<([^>]+)>)/gi, '').replace(/\s\s+/g, '')
  }

  /**
     * @param {CrawlerLoader} Req - The date
     */
  async Load (Req) {
    const result = new CrawlerResult()
    result.URL = Req.URL
    result.HttpMethod = Req.HttpMethod
    try {
      let URLResponse = ''
      if (Req.HttpMethod === HttpMethodType.GET) {
        const { data, status } = await axios.get(Req.URL)
        if (status !== 200) {
          throw Error('İstenilen adrese ulaşılamadı.')
        }
        URLResponse = data
      } else if (Req.HttpMethod === HttpMethodType.POST) {
        const { data, status } = await axios.post(Req.URL)
        if (status !== 200) {
          throw Error('İstenilen adrese ulaşılamadı.')
        }
        URLResponse = data
      }
      result.PageHTML = URLResponse
      result.Document = cheerio.load(result.PageHTML)
      result.IsError = false
    } catch (e) {
      result.IsError = true
      result.Error = e
    }
    return result
  }

  /**
     * @param {CrawlerLoader} Req - The date
     */
  async LoadJSON (Req) {
    const result = new CrawlerResultJSON()

    try {
      let URLResponse = ''
      result.URL = Req.URL
      result.HttpMethod = Req.HttpMethod
      if (Req.HttpMethod === HttpMethodType.GET) {
        const { data, status } = await axios.get(Req.URL, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000
        })
        if (status !== 200) {
          throw Error('İstenilen adrese ulaşılamadı.')
        }
        URLResponse = data
      } else if (Req.HttpMethod === HttpMethodType.POST) {
        const { data, status } = await axios.post(Req.URL, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000
        })
        if (status !== 200) {
          throw Error('İstenilen adrese ulaşılamadı.')
        }
        URLResponse = data
      }
      result.JSON = URLResponse
      result.IsError = false
    } catch (e) {
      result.IsError = true
      result.Error = e
    }
    return result
  }
}
