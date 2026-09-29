#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::net::{Shutdown, TcpStream, ToSocketAddrs};
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

#[derive(Clone)]
struct AgentConfig {
    host: String,
    port: u16,
    token: String,
}

struct AppState {
    agent: Mutex<AgentConfig>,
}

fn call_agent(config: &AgentConfig, method: &str, params: Value) -> Result<Value, String> {
    let address = format!("{}:{}", config.host, config.port);
    let socket = address
        .to_socket_addrs()
        .map_err(|error| format!("Agent 地址无效：{error}"))?
        .next()
        .ok_or_else(|| "Agent 地址为空".to_string())?;
    let mut stream = TcpStream::connect_timeout(&socket, Duration::from_secs(2))
        .map_err(|error| format!("无法连接 Agent {address}：{error}"))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(8)))
        .map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(2)))
        .map_err(|error| error.to_string())?;

    let request = json!({
        "id": 1,
        "method": method,
        "params": params,
        "token": config.token,
    });
    stream
        .write_all(format!("{}\n", request).as_bytes())
        .map_err(|error| format!("发送 Agent 请求失败：{error}"))?;
    stream
        .shutdown(Shutdown::Write)
        .map_err(|error| format!("关闭 Agent 请求流失败：{error}"))?;
    let mut response_line = String::new();
    BufReader::new(stream)
        .read_line(&mut response_line)
        .map_err(|error| format!("读取 Agent 响应失败：{error}"))?;
    let response: Value = serde_json::from_str(&response_line)
        .map_err(|error| format!("Agent 响应格式错误：{error}"))?;
    if response.get("ok").and_then(Value::as_bool) == Some(true) {
        Ok(response.get("result").cloned().unwrap_or(Value::Null))
    } else {
        Err(response
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("Agent 返回未知错误")
            .to_string())
    }
}

#[tauri::command]
async fn agent_call(state: State<'_, AppState>, method: String, params: Value) -> Result<Value, String> {
    let config = state.agent.lock().map_err(|_| "Agent 配置锁定失败".to_string())?.clone();
    tauri::async_runtime::spawn_blocking(move || call_agent(&config, &method, params))
        .await
        .map_err(|error| format!("Agent 任务异常：{error}"))?
}

#[tauri::command]
fn configure_agent(state: State<'_, AppState>, host: String, port: u16, token: String) -> Result<(), String> {
    let mut config = state.agent.lock().map_err(|_| "Agent 配置锁定失败".to_string())?;
    config.host = host;
    config.port = port;
    config.token = token;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            agent: Mutex::new(AgentConfig {
                host: "127.0.0.1".to_string(),
                port: 8765,
                token: String::new(),
            }),
        })
        .invoke_handler(tauri::generate_handler![agent_call, configure_agent])
        .run(tauri::generate_context!())
        .expect("error while running TonyPi Action Editor");
}

fn main() {
    run();
}
