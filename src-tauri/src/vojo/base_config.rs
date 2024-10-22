use serde::Deserialize;
use serde::Serialize;
use sqlx::Connection;
use sqlx::MySqlConnection;
#[derive(Deserialize, Serialize)]
pub enum BaseConfigEnum {
    #[serde(rename = "mysql")]
    Mysql(DatabaseHostStruct),
    #[serde(rename = "postgresql")]
    Postgresql(DatabaseHostStruct),
    #[serde(rename = "kafka")]
    Kafka(KafkaConfig),
}
impl BaseConfigEnum {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        match self {
            BaseConfigEnum::Mysql(config) => {
                let test_url = config.to_url("mysql".to_string());
                MySqlConnection::connect(&test_url).await.map(|_| ())?
            }
            BaseConfigEnum::Postgresql(config) => {
                let test_url = config.to_url("postgresql".to_string());
                MySqlConnection::connect(&test_url).await.map(|_| ())?
            }
            _ => {}
        }

        Ok(())
    }
}

#[derive(Deserialize, Serialize, Clone)]
pub struct KafkaConfig {
    pub broker: String,
    pub topic: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DatabaseHostStruct {
    pub host: String,
    pub database: String,
    pub user_name: String,
    pub password: String,
    pub port: i32,
}
impl DatabaseHostStruct {
    pub fn to_url(&self, protocol_name: String) -> String {
        format!(
            "{}://{}:{}@{}:{}/{}",
            protocol_name, self.user_name, self.password, self.host, self.port, self.database
        )
    }
}
#[derive(Deserialize, Serialize)]
pub struct BaseConfig {
    pub base_config_enum: BaseConfigEnum,
}

#[test]
fn test_host() -> Result<(), anyhow::Error> {
    let test_database_request = BaseConfigEnum::Mysql(DatabaseHostStruct {
        host: "localhost".to_string(),
        database: "test".to_string(),
        user_name: "root".to_string(),
        password: "123456".to_string(),
        port: 3306,
    });
    let ss = BaseConfig {
        base_config_enum: test_database_request,
    };
    let json_str = serde_json::to_string(&ss)?;
    println!("{}", json_str);

    Ok(())
}
